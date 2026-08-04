# Phase 9.2 — Pi Deployment Checklist (Pre-Execution Review)

**Date**: 2026-08-04
**Purpose**: Gate review of commit `0b86279` (Phase 9.1 artifacts) before executing `DEPLOYMENT_RUNBOOK.md` on the Pi node `admin@192.168.0.102`.
**Result**: ✅ READY TO PROCEED — 2 minor runbook fixes flagged (non-blocking, correct before execution).
**Constraint honored**: no code changes were made during this review.

---

## 1. docker-compose does not conflict with existing Pi services — ✅ PASS

Reviewed `projects/tars-face/docker-compose.yml` against the live Pi inventory (`PI_NODE_AUDIT.md` + re-verified via SSH this session).

| Item | TARS compose | Existing Pi | Verdict |
|------|-------------|-------------|---------|
| Port 3000 | — | worldmonitor | no overlap |
| Port 8000 | — | tse_fastapi_backend | no overlap |
| Port 5432 | — | tse_postgres_db | no overlap |
| Port 11434 | — | Ollama | no overlap |
| Port 8080 | `8080:8080` | **FREE (verified)** | ✅ safe |
| Container name | `tars_backend` | no existing container with this name | ✅ unique |
| Network name | `tars_net` (explicit `name:` key) | bridge, host, none, duckdns_default, tse-production-lab_default, worldmonitor_default | ✅ no collision |
| Compose project | `name: tars-node` | worldmonitor, tse-production-lab, duckdns | ✅ distinct |

**Conclusion**: TARS is fully additive. No existing service, container, volume, or network is referenced or modified.

---

## 2. Port 8080 is the only exposed host port — ✅ PASS

Verified in `docker-compose.yml` (only one `ports:` mapping):

```yaml
ports:
  - "8080:8080"
```

- No other `ports:` entries.
- No `expose:` side-effects to the host (container-internal WS/REST all ride on 8080).
- Healthcheck targets `127.0.0.1:8080/health` **inside** the container — no host port consumed by the check.
- Dockerfile `EXPOSE 8080` (documentation only) matches.

**Conclusion**: exactly one host port published. The 7 existing host listeners (22, 3000, 5432, 8000, 8079, 11434) are untouched.

---

## 3. No assumptions about local filesystem paths — ✅ PASS (with 1 nuance)

Reviewed `Dockerfile`, `docker-compose.yml`, `.dockerignore`, and `server.js`:

- **No `volumes:`** in compose → zero host-path bind mounts. Confirmed the only `ports:`/`networks:` mappings are listed; "volumes" appears only in a comment.
- Dockerfile paths are **all container-internal**: `/srv/tars/...`, `./pi-server/`, etc. No `/home/admin`, no Pi paths baked in.
- All `COPY` targets exist in the repo (verified): `pi-server/package.json`, `pi-server/package-lock.json`, `pi-server/server.js`, `tars_face_v1.html`, `three.module.js`, `config/tars-config.json`.
- `server.js` resolves paths relative to `__dirname` (`ROOT = path.resolve(__dirname, "..")`), independent of host layout.
- `.dockerignore` excludes `pi-server/node_modules/` so the `npm ci` install isn't clobbered by the later `COPY pi-server/`.

**NUANCE (non-blocking, behavioral only)**: `config/tars-config.json` network monitor includes `{ "id": "tars", "address": "localhost" }`. Inside the container, `localhost` resolves to the **container itself**, so the "tars" host will always report as "up". This is observability-only (network monitor degrades gracefully) and does not affect TARS boot. Acceptable for Phase 9.2; optionally adjust host list in a later phase.

---

## 4. Deployment runbook commands match actual repository paths — ✅ PASS with 2 fixes

Walked every command in `docs/DEPLOYMENT_RUNBOOK.md` against the committed tree.

| Runbook step | Command | Path match |
|--------------|---------|-----------|
| §2 clone | `git clone --depth 1 ... tars-face` | ✅ produces `/home/admin/tars-face` |
| §2 sparse | `git sparse-checkout set projects/tars-face` | ✅ subtree matches committed layout |
| §2 verify | `ls projects/tars-face` → expects Dockerfile, docker-compose.yml, .dockerignore, config, pi-server, tars_face_v1.html, three.module.js | ✅ **all exist** (verified §3) |
| §3 build | `cd /home/admin/tars-face/projects/tars-face` → `docker build -t tars-backend:1.0.0 .` | ✅ compose file + Dockerfile live exactly here |
| §3 up | `docker compose up -d` | ✅ composes from this dir (`name: tars-node`) |
| §3 health | `curl http://127.0.0.1:8080/health` | ✅ server.js:50 endpoint |
| §4 frontend | `curl .../` | ✅ `tars_face_v1.html` served from ROOT |
| §4 module | `curl .../three.module.js` | ✅ file present at ROOT, page imports `/three.module.js` |

**Fix 1 — rollback contradiction (§5, L3)**: the block runs `rm -rf /home/admin/tars-face` and then the "fallback to manual runtime" step does `cd /home/admin/tars-face/projects/tars-face/pi-server` into the **deleted** directory. The manual-node fallback cannot run after L3 removal. **Fix**: reorder — run the manual fallback *before* the `rm -rf`, or move the fallback to its own section that only applies if the repo still exists.

**Fix 2 — typo (§5 comment)**: `# remove deployment (PIs change not touched)` → should read `(Pi's change not touched)`.

---

## 5. Additional verified items (beyond the 4 requested)

| Check | Result |
|-------|--------|
| Healthcheck command exists in base image | ✅ `node:20-alpine` → busybox provides `wget --spider` |
| Non-root container | ✅ `USER node` (UID 1000) before all runtime steps |
| Restart policy | ✅ `restart: unless-stopped` |
| Isolated network | ✅ `tars_net` bridge (explicit name, not the default `bridge`) |
| Image tag | ✅ `tars-backend:1.0.0` (pinned, not `latest`) — rollback-friendly |
| No CDN dependency | ✅ frontend imports `/three.module.js` (offline-capable) |
| Git state | ✅ commit `0b86279` pushed; working tree clean of staged changes |

---

## 6. Recommended pre-execution edits (to `DEPLOYMENT_RUNBOOK.md` only)

1. Reorder rollback §5 so the manual `nvm` fallback is documented **before** the `rm -rf` (or clearly labeled "only if repo still present").
2. Fix the `PIs` typo in the §5 comment.

These are documentation-only corrections; no runtime, Dockerfile, or compose changes are required. Phase 9.2 execution may proceed after applying them.

---

*Review only. No files were modified during this checklist.*
