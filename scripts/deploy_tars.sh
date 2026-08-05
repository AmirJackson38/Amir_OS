#!/bin/bash

# TARS deployment helper. Deploys a committed revision to tars.local and
# records the exact running-image provenance. No credentials are stored here.

set -Eeuo pipefail

echo "Starting TARS deployment to Pi..."

ssh admin@tars.local << 'EOF'
set -Eeuo pipefail

REPO_ROOT="/home/admin/tars-face"
APP_DIR="$REPO_ROOT/projects/tars-face"
HEALTH_FILE="/tmp/tars-health.json"

cd "$REPO_ROOT" || { echo "TARS directory not found."; exit 1; }

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Pi checkout has tracked local changes; refusing destructive deployment."
  exit 1
fi

git fetch origin master
DEPLOY_SHA="$(git rev-parse FETCH_HEAD)"
git reset --hard "$DEPLOY_SHA"

cd "$APP_DIR"
docker compose build

IMAGE_DIGEST="$(docker image inspect --format '{{.Id}}' tars-backend:1.0.0)"
DEPLOYED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

export TARS_GIT_SHA="$DEPLOY_SHA"
export TARS_IMAGE_DIGEST="$IMAGE_DIGEST"
export TARS_DEPLOYED_AT="$DEPLOYED_AT"
export TARS_VALIDATION_STATUS="pending"
docker compose up -d --force-recreate

HEALTHY=false
for attempt in 1 2 3 4 5 6; do
  if curl -fsS http://127.0.0.1:8080/health > "$HEALTH_FILE"; then
    HEALTHY=true
    break
  fi
  sleep 5
done

[ "$HEALTHY" = true ] || { echo "TARS health endpoint did not become available."; exit 1; }
grep -Fq "\"gitSha\":\"$DEPLOY_SHA\"" "$HEALTH_FILE" || { echo "Running Git SHA did not validate."; exit 1; }
grep -Fq "\"imageDigest\":\"$IMAGE_DIGEST\"" "$HEALTH_FILE" || { echo "Running image digest did not validate."; exit 1; }
grep -Fq "\"deployedAt\":\"$DEPLOYED_AT\"" "$HEALTH_FILE" || { echo "Deployment timestamp did not validate."; exit 1; }

export TARS_VALIDATION_STATUS="validated"
docker compose up -d --force-recreate

FINAL_HEALTHY=false
for attempt in 1 2 3 4 5 6; do
  if curl -fsS http://127.0.0.1:8080/health > "$HEALTH_FILE"; then
    FINAL_HEALTHY=true
    break
  fi
  sleep 5
done

[ "$FINAL_HEALTHY" = true ] || { echo "TARS did not become healthy after validation recreation."; exit 1; }
grep -Fq "\"gitSha\":\"$DEPLOY_SHA\"" "$HEALTH_FILE" || { echo "Running Git SHA changed after validation."; exit 1; }
grep -Fq "\"imageDigest\":\"$IMAGE_DIGEST\"" "$HEALTH_FILE" || { echo "Running image digest changed after validation."; exit 1; }
grep -Fq "\"deployedAt\":\"$DEPLOYED_AT\"" "$HEALTH_FILE" || { echo "Deployment timestamp changed after validation."; exit 1; }
grep -Fq '"validationStatus":"validated"' "$HEALTH_FILE" || { echo "Validation status did not persist."; exit 1; }

printf '{\n  "gitSha": "%s",\n  "imageDigest": "%s",\n  "deployedAt": "%s",\n  "validationStatus": "validated"\n}\n' \
  "$DEPLOY_SHA" "$IMAGE_DIGEST" "$DEPLOYED_AT" > "$REPO_ROOT/.tars-deployment-provenance.json"

echo "Deployment provenance validated: $DEPLOY_SHA $IMAGE_DIGEST"
EOF
