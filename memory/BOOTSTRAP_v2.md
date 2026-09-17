# Amir OS Session Resume Bootstrap (Dual-Track Synchronized)

> **Current Project Truth:** Root `HEAD.md` maintains live operational TARS engine truth. `docs/home-lab-network.md` maintains authoritative homelab topology.
>
> **Synchronized:** 2026-09-08
> **Amir OS Platform:** `v0.9.0`
> **Active Engineering Tracks:**
> - **Track 1 (TARS Engine):** Phase 9.4 / 10.3.1 Observatory extraction candidate (shadow validation). Baseline release `tars-v9.3.2`.
> - **Track 2 (Home Lab & Media Stack):** Alarm Media Pi 4 (`192.168.0.103` - Immich, Plex, Node-Exporter) active and healthy. TrueNAS & Core 2.5G network unified with passwordless ed25519 SSH.

---

## 1. System File Index (Lazy Loading)

Load secondary detail files on-demand based on the user's focus:
- **Root & TARS Truth:** [`HEAD.md`](file:///C:/Users/Admin/OneDrive/Documents/Amir_OS/HEAD.md) | [`projects/tars-face/docs/CURRENT_STATE.md`](file:///C:/Users/Admin/OneDrive/Documents/Amir_OS/projects/tars-face/docs/CURRENT_STATE.md) | [`projects/tars-face/docs/ARCHITECTURE.md`](file:///C:/Users/Admin/OneDrive/Documents/Amir_OS/projects/tars-face/docs/ARCHITECTURE.md)
- **Home Lab Topology & Credentials:** [`docs/home-lab-network.md`](file:///C:/Users/Admin/OneDrive/Documents/Amir_OS/docs/home-lab-network.md) | [`docs/SESSION_SUMMARY_2026-09-03.md`](file:///C:/Users/Admin/OneDrive/Documents/Amir_OS/docs/SESSION_SUMMARY_2026-09-03.md)
- **Memory & Change History:** [`memory/SESSION_LOG_v2.md`](file:///C:/Users/Admin/OneDrive/Documents/Amir_OS/memory/SESSION_LOG_v2.md) | [`memory/STAGING_INTENT.md`](file:///C:/Users/Admin/OneDrive/Documents/Amir_OS/memory/STAGING_INTENT.md) | [`memory/ACTIVE_PROJECT_v2.md`](file:///C:/Users/Admin/OneDrive/Documents/Amir_OS/memory/ACTIVE_PROJECT_v2.md)

---

## 2. Active Tracks & Live Node Matrix

### Track 1: TARS Autonomous World Engine (`projects/tars-face`)
* **Identity:** Offline-first autonomous 3D world engine (Three.js frontend + Node backend event bus). Authoritative `worldState`, local needs scheduler, physics objects, and telemetry.
* **Current State:** Phase 10.3.1 candidate in shadow mode (`?observatoryMode=shadow`). Release baseline `tars-v9.3.2`. Behavior baseline `b07e063` (Phase 9.4 behavioral memory).
* **Production Node:** `tars.local` (`192.168.0.104:8080`, Raspberry Pi 4 8GB). `tars_backend` Docker container.

### Track 2: Home Lab & Edge Infrastructure
* **Alarm Media Pi 4 (`alarm.local` / `192.168.0.103`):**
  - **Hardware/OS:** Raspberry Pi 4 Model B (4GB), Arch Linux ARM (`alarm`).
  - **Storage:** 2TB Lexar External SSD (`/dev/sda1` ext4) mounted at `/mnt/storage`.
  - **Immich Stack (`:2283`):** Photo/video cloud backed by PostgreSQL 14 with VectorChord (`ghcr.io/immich-app/postgres:14-vectorchord0.4.3-pgvectors0.2.0`), ML server (`:3003`), Redis (`:6379`). Library on SSD (`/mnt/storage/immich/library`).
  - **Plex Media Server (`:32400`):** Host network mode, media at `/mnt/storage/media`.
  - **Node Exporter (`:9100`):** System metrics for Prometheus.
  - **Remote Mobile Sync:** WireGuard VPN on ER605 (`amirshomelab.duckdns.org:51820`, `10.10.0.2/32` iPhone client) routed to `192.168.0.0/24`.
* **TrueNAS SCALE Node (`truenas.local` / `192.168.0.100`):**
  - Dell OptiPlex 755. Web GUI (443), passwordless root SSH via API 2.0 key injection.
* **Core Network Fabric:**
  - **Gateway:** TP-Link ER605 v2 (`router.local` / `192.168.0.1`). Dual-subnet WAN `10.0.0.0/24` + LAN `192.168.0.0/24`.
  - **Core 2.5G Switch #1:** RealHD SW8-25G-MGV2 (`switch1.local` / `192.168.0.2`).
  - **Workstation 2.5G Switch #2:** RealHD SW8-25G-MGV2 (`switch2.local` / `192.168.0.3`).

---

## 3. Fast-Boot Ready State Template

When generating the session-opening **Ready State**, synthesize status across both active tracks:

```text
### Ready State: Amir OS

* Milestone: Amir OS v0.9.0 | TARS tars-v9.3.2 | Homelab Media Stack Live
* Active Tracks:
  1. TARS World Engine: Phase 10.3.1 Observatory extraction candidate (shadow mode). Next: Physical presence / display integration on tars.local (192.168.0.104).
  2. Home Lab: Alarm Media Pi 4 (192.168.0.103) running Immich (:2283), Plex (:32400), Node Exporter (:9100) on 2TB SSD (/mnt/storage). WireGuard ingress verified.
* Last Progress: Homelab service migration, VectorChord Postgres upgrade, and fleet-wide passwordless SSH deployment.
* Next Action Candidates:
  - Homelab: Configure ER605 static DHCP reservations for alarm/tars/truenas; set up automated backups or reverse proxy/SSL.
  - TARS: Physical display panel integration or Phase 10.3.1 shadow candidate validation.
```

---

## 4. Key Invariants & Operational Rules

1. **Dual-Track Awareness:** Amir OS encompasses both the autonomous 3D agent (TARS) and home lab systems architecture. Do not assume every session is solely about TARS.
2. **Production Validation:** Windows is development; `alarm.local` and `tars.local` are production. Test live before claiming container health.
3. **Write-Through Discipline:** When concluding a session on either track, update `memory/SESSION_LOG_v2.md` AND verify `memory/BOOTSTRAP_v2.md` reflects latest milestones.
