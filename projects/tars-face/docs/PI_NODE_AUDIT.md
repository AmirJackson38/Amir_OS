# TARS Raspberry Pi Node — Physical Reality Audit

**Date**: 2026-08-04 (session: 2026-08-03/04)
**Node**: `tars` @ `192.168.0.102`
**Method**: Live SSH inspection (`admin@192.168.0.102`) — **read-only, nothing modified**
**Base context**: Phase 9 blueprint (`PHASE_9_DEPLOYMENT_BLUEPRINT.md`) is the workshop design; this doc is the **inspection of the actual hardware** before any install.

---

## 0. Executive Summary

The Raspberry Pi at `192.168.0.102` is a **healthy, long-running homelab node** — but it is **NOT running any piece of the TARS face system**. Specifically:

- The `tars-face` project (and `Amir_OS` itself) is **completely absent** from this Pi. `find` returned zero results for `tars_face_v1.html`, `tars-face`, and `Amir_OS`.
- The Pi runs a **production homelab stack**: TSE FastAPI backend + Postgres, a "World Monitor" docker stack, DuckDNS, and a local Ollama LLM.
- **No Chromium**, **no kiosk mode**, **no display server**, **no X11** — the Pi is **headless** (both HDMI connectors report disconnected, no DSI panel detected, no touch device).
- **No TARS backend container** and **no node server on port 8080** (nothing listening on 8080/5000).
- Node.js exists **only via `nvm`** (`v24.11.0`) in the `admin` user profile — not on PATH, not a system service.

**Phase 9 implication**: nothing on this Pi will be "bulldozed" by deploying TARS — TARS is not here. But the homelab stack (TSE, worldmonitor, duckdns, ollama, postgres) **is** real and must be protected. The ideal end-state (Pi 4 = TARS appliance) and the current homelab reality **can coexist** if Phase 9 adds rather than replaces.

---

## 1. Operating System

| Property | Value |
|----------|-------|
| Distro | Debian GNU/Linux 13 (trixie) |
| Version | 13.1 (Debian book, Raspberry Pi OS base) |
| Kernel | `6.12.47+rpt-rpi-v8` #1 SMP PREEMPT (2025-09-16) |
| Architecture | `aarch64` (ARMv8 64-bit) |
| Uptime | 16 days 20h at audit time (healthy, stable) |
| Boot firmware | `/boot/firmware` (vfat), cmdline uses `root=PARTUUID=f4ed38ba-02`, `cfg80211.ieee80211_regdom=US` |
| Display config | `display_auto_detect=1`, `dtoverlay=vc4-kms-v3d`, `dtoverlay=dwc2,dr_mode=host`, `disable_overscan=1` |

---

## 2. Hardware

| Property | Value |
|----------|-------|
| Model | Raspberry Pi 4 Model B **Rev 1.5** |
| SoC | Broadcom BCM2711 (ARM Cortex-A72 quad-core) |
| RAM | **4 GB** (3.7 GiB usable); swap: 2 GiB zram + 2 GiB loop |
| Memory pressure | 830 MiB used / 2.9 GiB available — ample headroom |
| Temp | 31.6 °C (cool, well within limits) |
| Storage | microSD `mmcblk0` 117 GB → root `mmcblk0p2` 116.5G ext4 `/`, boot `mmcblk0p1` 512M vfat `/boot/firmware` |
| Display | **NONE connected** — HDMI-A-1 + HDMI-A-2 both `disconnected` (kmsprint), no DSI panel loaded, no display server (no X11, no Wayland) |
| Touch | **NONE** — only `vc4-hdmi-0/1` CEC + HDMI-jack input events; no `ID_INPUT_TOUCHSCREEN` devices |
| USB | VIA Labs USB3 hub (empty); no other USB peripherals attached |

> **Contradiction with docs**: `docs/home-lab-network.md` describes a Vilros Pi 4 kit with a **Hosyond 5" MIPI DSI touchscreen** and **3.5" SPI touchscreen** and Cat 8 ethernet. **Reality on THIS node: no display, no touch, gigabit ethernet (confirmed 1000 Mb/s).** Either the screens are on the second Pi or not yet attached. Verify physically before assuming kiosk hardware exists.

---

## 3. Runtime Services

### 3.1 Docker

| Check | Result |
|-------|--------|
| Docker installed | ✅ `Docker 29.6.1`, Compose **v5.3.1** |
| Docker enabled at boot | ✅ `docker.service`, `containerd.service`, `docker.socket` all `enabled` |
| `admin` in docker group | ✅ passwordless docker access |

### 3.2 Running containers (7)

| Container | Image | Status | Ports | Restart policy |
|-----------|-------|--------|-------|----------------|
| worldmonitor | worldmonitor:latest | Up 11 days (healthy) | `0.0.0.0:3000→8080` | `unless-stopped` |
| worldmonitor-ais-relay | worldmonitor-ais-relay:latest | Up 11 days (healthy) | 3004/tcp | `unless-stopped` |
| worldmonitor-redis-rest | worldmonitor-redis-rest:latest | Up 11 days | `127.0.0.1:8079→80` | `unless-stopped` |
| worldmonitor-redis | redis:7-alpine | Up 11 days | 6379/tcp | `unless-stopped` |
| duckdns | linuxserver/duckdns | Up 2 weeks | — | `unless-stopped` |
| tse_fastapi_backend | tse-production-lab-backend | Up 2 weeks | `0.0.0.0:8000→8000` | `always` |
| tse_postgres_db | postgres:15-alpine | Up 2 weeks | `0.0.0.0:5432→5432` | `always` |

### 3.3 Compose files (verified on disk)

- `/home/admin/worldmonitor/docker-compose.yml` + `.override.yml` (worldmonitor, ais-relay, redis, redis-rest, redis-data)
- `/home/admin/tse-production-lab/docker-compose.yml` (db, backend)
- `/home/admin/duckdns/docker-compose.yml`

### 3.4 Non-container processes

- `node redis-rest-proxy.mjs` (root, in worldmonitor container)
- `node scripts/ais-relay.cjs` (in worldmonitor container)
- `node /app/local-api-server.mjs` (in worldmonitor container)
- `uvicorn main:app --port 8000` (TSE FastAPI backend, pid 1181, root, Jul18)
- **Ollama** on `*:11434` (local LLM) — model **`phi3:mini`** only

### 3.5 Web / kiosk / app servers

| Check | Result |
|-------|--------|
| nginx / apache2 | ❌ not installed |
| Chromium | ❌ not installed (no `chromium`, no `chromium-browser`) |
| Kiosk / fullscreen / autologin | ❌ nothing (no X11 at all) |
| TARS backend on :8080 | ❌ nothing listening on 8080 or 5000 |
| tars-assistant project | 📁 present at `/home/admin/tars-assistant` (Python + Vite frontend) but **NOT running**, **no systemd unit** |

### 3.6 Listening ports

```
0.0.0.0:22    SSH
0.0.0.0:3000  worldmonitor
0.0.0.0:8000  TSE FastAPI
0.0.0.0:5432  Postgres
127.0.0.1:8079 worldmonitor redis-rest
*:11434       Ollama
```

---

## 4. Networking

| Property | Value |
|----------|-------|
| Hostname | `tars` |
| LAN IP (eth0) | `192.168.0.102/24` — default route via `192.168.0.1` (metric 100, **primary**) |
| WiFi IP (wlan0) | `10.0.0.231/24` — default route via `10.0.0.1` (metric 600, **fallback**) |
| Dual-homed | ✅ Both eth0 + wlan0 UP — resilient connectivity |
| Ethernet | Gigabit (confirmed `speed=1000`) |
| DNS | `1.1.1.1`, `8.8.8.8`, Comcast `75.75.75.75/76`, `2001:558:feed::*` (external only; no local resolver) |
| Internet | ✅ Reachable at audit time (CDN returned HTTP 200 in 0.37s) |
| Docker bridges | tse-production-lab_default (172.20.0.0/16), worldmonitor_default (172.18.0.0/16), duckdns_default (172.19.0.0/16), docker0 (DOWN) |

**Internet dependency today**: The node is online, but its **only** hard online dependency is the current CDN Three.js import in the (unshipped) frontend. Once Phase 9 repoints that to a local module, the Pi can operate fully offline while still using eth0 for LAN telemetry and wlan0 as a fallback.

---

## 5. Storage

| Item | Value |
|------|-------|
| Root filesystem | `/dev/mmcblk0p2` ext4, 115G total, **18G used, 93G avail (16% used)** — plenty of room for TARS |
| Boot | `/dev/mmcblk0p1` vfat 510M, 13% used |
| Amir_OS location | ❌ **NOT on this Pi** (find returned nothing) |
| Mounted network/USB drives | **None** (no NFS/SMB/USB mounts found) |
| Permissions | `admin` in groups: `admin adm dialout cdrom sudo audio video plugdev games users input render netdev spi i2c gpio ollama docker`; **passwordless sudo** confirmed |

**Repo deployment targets** (candidate): `/home/admin/tars-face` (mirrors the existing `/home/admin/{worldmonitor,tse-production-lab,duckdns}` layout). 93 GB free is ample.

---

## 6. Current TARS Deployment Status

| Question | Answer | Evidence |
|----------|--------|----------|
| Can the Pi launch `tars_face_v1.html` today? | ❌ **No** | File not on the Pi; no web server for it; no Chromium; would also fail offline due to CDN import |
| Can the Pi run the backend today? | ❌ **Not as a service** | Node only via `nvm` (not on PATH/systemd); no server.js; no 8080 listener; nothing auto-starts |
| Can the Pi survive reboot? | ⚠️ **Homelab yes, TARS no** | Docker + containers auto-start (`always`/`unless-stopped`); but no TARS units exist |
| Can the Pi operate offline? | ⚠️ **Homelab mostly yes; TARS not testable** | Docker services don't need internet; DuckDNS needs it (separate). TARS not present to test |

**Bottom line**: TARS on this node is **greenfield** — nothing to conflict with, but also nothing works yet. The existing homelab stack is the thing to protect, not the TARS stack.

---

## 7. What This Means for Phase 9 (Pre-Implementation Guardrails)

### 7.1 Protect the existing homelab (do NOT bulldoze)

- **Do not** publish TARS on conflicting ports (3000, 8000, 5432, 11434 are taken). TARS backend uses **8080** — free ✅.
- **Do not** touch compose projects in `/home/admin/{worldmonitor,tse-production-lab,duckdns}`.
- **Do not** remove `phi3:mini`/Ollama — the local LLM is a Phase 9+ optional resource, not a conflict.
- The running TSE FastAPI (port 8000) is a **separate T.A.R.S. backend lineage** (`tars-assistant`/TSE lab) — keep distinct from the face runtime.

### 7.2 Facts to correct in docs

| Doc claim | Reality |
|-----------|---------|
| Pi has Hosyond 5" DSI + 3.5" SPI touchscreens attached | ❌ **Neither present** on this node — headless |
| "RPi 4 4GB/8GB" | ✅ 4GB confirmed |
| Docker Node: TSE (8000), Postgres (5432), DuckDNS | ✅ **confirmed exactly** |
| `192.168.0.102` ethernet | ✅ confirmed, plus wlan0 `10.0.0.231` (dual-homed) |

### 7.3 Phase 9 deployment shape (validated by reality)

```
Pi 4 "tars" (192.168.0.102) — Debian 13, Docker, gigabit, 4GB RAM
  ├── Docker 29.6.1 + Compose v5
  │     ├── tars-backend   :8080   (NEW — add-only, port free)
  │     ├── worldmonitor   :3000   (existing — leave alone)
  │     ├── tse backend    :8000   (existing — leave alone)
  │     ├── postgres       :5432   (existing — leave alone)
  │     └── duckdns                (existing — leave alone)
  ├── Ollama :11434 (existing; future optional TARS LLM hook)
  └── Kiosk (MISSING today — needs: display + Chromium + X11/session + systemd unit)
```

### 7.4 Pre-install blockers (hardware, not software)

- **No display and no touch hardware** are attached to this node. The kiosk layer (Step 4 of the Phase 9 blueprint) **cannot be tested here until a screen is connected**.
- The blueprint's kiosk/systemd work can be written and validated on the dev machine, but on-node kiosk bring-up requires the Hosyond screen (or an HDMI monitor).
- Recommendation: Phase 9 software steps (offline Three.js, Dockerfile, compose, systemd templates) are safe to proceed; **the physical display bring-up is a separate, hardware-gated step** to sequence with attaching the touchscreen.

---

## 8. Audit Method & Integrity

- All data collected via read-only SSH commands: `os-release`, `uname`, `free`, `lsblk`, `df`, `findmnt`, `docker ps/inspect`, `systemctl`, `ss -tlnp`, `ip -brief addr`, `kmsprint`, `/proc/bus/input/devices`, `dmesg`, `vcgencmd`.
- **Nothing was installed, removed, started, stopped, or modified.**
- SSH access used existing `id_ed25519` (`amir-tse-lab`) + `known_hosts` entry for `tars`/`192.168.0.102` — no new credentials or config created.

---

## 9. Open Questions for Amir (need human confirmation)

1. **Which physical Pi is this?** The lab doc mentions two Pi 4s. Is `192.168.0.102` the one intended to become the TARS face appliance?
2. **Where are the Hosyond touchscreens?** Neither is attached. Are they reserved for this node, and when will they be connected?
3. **Is the TSE FastAPI backend (port 8000) sacred?** It must remain untouched; confirm its role vs the face runtime.
4. **Is `tars-assistant` (dormant, `/home/admin/tars-assistant`) obsolete or planned for resurrection?** It shares the "TARS" name and should not be confused with the face system.
5. **Storage path preference** for the TARS deployment: `/home/admin/tars-face` (consistent with existing projects) — acceptable?
