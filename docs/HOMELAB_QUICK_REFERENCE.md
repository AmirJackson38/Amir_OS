# Homelab quick reference

Navigation, not live health proof. Last verified during Homarr recovery on 2026-10-20. Recheck before changes; load detailed history only when needed.

## Execution and access

- Local client: Windows, PowerShell. Use native `C:\Users\Admin\...` paths with file tools.
- Alarm Pi: `alarm@192.168.0.103`; SSH key access was verified. Linux paths below are on this Pi, not Windows.
- Probe access first: `ssh -o BatchMode=yes -o ConnectTimeout=8 alarm@192.168.0.103 'hostname'`.
- Read container state: `ssh alarm@192.168.0.103 'docker ps --format "{{.Names}} {{.Status}}"'`.
- Docker access worked; passwordless `sudo -n` did not. A root-owned database is not evidence that SSH is unavailable. Homarr's container has Node and SQLite support; inspect before choosing an edit method.

## Service map

| Service | Browser address | Relevant location |
|---|---|---|
| Homarr | `http://192.168.0.103:7575/boards/homelab` | Container `homarr`; service directory `/mnt/storage/services/homarr/` |
| Transmission | `http://192.168.0.103:9091` | Container `transmission`; RPC `/transmission/rpc` |
| Embedded terminal | `http://192.168.0.103:7681` | Container `homarr-terminal` |
| Clock/weather panels | `http://192.168.0.103:7576` | Container `lab-observatory` |

Homarr database: `/mnt/storage/services/homarr/appdata/db/db.sqlite` on host, `/appdata/db/db.sqlite` in container. Use read-only inspection initially. For SQL from PowerShell, pipe a quoted SQL string into remote `sqlite3 -readonly`; avoid nested shell quoting and Bash heredocs in PowerShell.

## Homarr checks that matter

- App cards: `item.options.json.appId` references `app.id`. Missing `app` records can leave blank cards/icons.
- Downloads: `item.kind = downloads` needs an `integration_item` link to a `transmission` integration and valid encrypted `integrationSecret` records. App links and data widgets are separate.
- Transmission RPC normally challenges with HTTP 409 and an `X-Transmission-Session-Id`; retry with that header and existing credentials. A web page response alone does not verify RPC.
- Actual widget endpoint verified: `/api/trpc/widget.downloads.getJobsAndStatuses`, with URL-encoded SuperJSON input containing `integrationIds` and `limitPerIntegration`. Use the real widget response to verify data, not just container uptime.
- Homarr credentials are encrypted with its existing key. Preserve them; never print decrypted values or replace the encryption key during a widget repair.

## Evidence and deeper context

- Latest targeted recovery: [Homarr recovery record](../memory/SESSION_2026-10-20_HOMARR_RECOVERY.md), including exact IDs, backup path, checks, and uncertainty.
- Wider topology: `docs/home-lab-network.md` (load only the relevant section; do not copy credentials into new notes).
- Earlier intentions: `memory/STAGING_INTENT.md` is historical context, not permission to replay migrations.
- On the next meaningful change, update this reference only if routes/locations changed; append dated outcome evidence separately. Avoid duplicating full session history here.
