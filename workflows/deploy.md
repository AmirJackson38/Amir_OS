---
name: deploy
description: Deploy TARS or Amir OS components to target environments
version: 1.0.0
requires_skills: [tars-architecture]
requires_tools: []
---

# Workflow: Deploy

## When to Use

- Deploying TARS frontend to a web server
- Deploying TARS backend to Docker or Raspberry Pi
- Publishing changes to production
- Updating a deployed instance

## Steps

1. **Verify build** — Confirm the component is in a deployable state.
2. **Backup** — Ensure current production state is backed up.
3. **Deploy** — Transfer files, restart services, apply changes.
4. **Verify** — Confirm the deployment is running correctly.
5. **Rollback plan** — Know how to revert if something goes wrong.
