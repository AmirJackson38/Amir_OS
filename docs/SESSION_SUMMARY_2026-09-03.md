# Amir Home Lab & Infrastructure Session Summary
**Date:** September 3, 2026
**Author:** Antigravity Engineering Assistant (Amir OS v0.9.0)
**Target Audience:** Succeeding AI Agents & Engineering Pair Programmers
**Authoritative Documentation:** [`docs/home-lab-network.md`](file:///C:/Users/Admin/OneDrive/Documents/Amir_OS/docs/home-lab-network.md) | [`memory/BOOTSTRAP_v2.md`](file:///C:/Users/Admin/OneDrive/Documents/Amir_OS/memory/BOOTSTRAP_v2.md)

---

## 1. Executive Summary of Accomplishments

Today's session resolved three primary operational bottlenecks in Amir's home lab and unified network endpoints under a consolidated hostname and passwordless SSH access model:
1. **WireGuard Remote VPN Ingress Fixed:** Corrected peer endpoint configuration on mobile client (`amirshomelab.duckdns.org:51820`), added `192.168.0.0/24` to `AllowedIPs`, and validated mobile Immich photo sync.
2. **Alarm Media Pi 4 Services Deployed:** Deployed Immich (`:2283`), Plex (`:32400`), and Node Exporter (`:9100`) on Arch Linux ARM with a 2TB SSD at `/mnt/storage`. Resolved Docker volume timezone collision and upgraded vector database to VectorChord.
3. **RealHD Switch #2 Root-Cause Isolation & Reconfiguration:** Diagnosed the "flashing login loop" bug on factory default switch (`192.168.2.1`), automated its reconfiguration to `192.168.0.3`, updated credentials to `AmirBarry24!`, and saved settings to flash NVRAM.
4. **Fleet-Wide Passwordless SSH Key Deployment:** Deployed Amir's `id_ed25519` public key to the Alarm Pi and TrueNAS SCALE (via API 2.0), enabling instant passwordless CLI access across all compute nodes.
5. **Master Name Resolution & SSH Aliasing:** Configured Windows `~/.ssh/config` and `C:\Windows\System32\drivers\etc\hosts` with `.local` hostnames and short aliases.

---

## 2. Active Master Device & Access Matrix

| Hostname / Alias | Physical Hardware | IP Address | Management Protocol | Auth Credentials | Verification State |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`router.local`** / `er605` | TP-Link Omada ER605 v2 | `192.168.0.1` | HTTPS (443) / SSH (22) | `admin` / `Kaylan38` | `VERIFIED` (Standalone Mode) |
| **`switch1.local`** / `switch1` | RealHD SW8-25G-MGV2 | `192.168.0.2` | HTTP (80) Web GUI | `admin` / `AmirBarry24!` | `VERIFIED` (Core 2.5G Switch) |
| **`switch2.local`** / `switch2` | RealHD SW8-25G-MGV2 | `192.168.0.3` | HTTP (80) Web GUI | `admin` / `AmirBarry24!` | `VERIFIED` (Workstation 2.5G Switch) |
| **`truenas.local`** / `truenas` | Dell OptiPlex 755 | `192.168.0.100` | HTTPS (443) / SSH (22) | `root` / `~/.ssh/id_ed25519` | `VERIFIED` (Passwordless SSH Active) |
| **`alarm.local`** / `alarm` | Raspberry Pi 4 (4GB) | `192.168.0.103` | SSH (22) / HTTP (Docker) | `alarm` / `~/.ssh/id_ed25519` | `VERIFIED` (Passwordless SSH Active) |
| **`tars.local`** / `tars` | Raspberry Pi 4 (8GB) | `192.168.0.104` | SSH (22) / HTTP (:8080) | `admin` / `~/.ssh/id_ed25519` | `VERIFIED` (Passwordless SSH Active) |
| **`s8`** | Samsung Galaxy S8 | `10.0.0.238` | SSH (8022 - Termux) | `u0_a211` / `~/.ssh/s8_termux` | `CONFIGURED` in `~/.ssh/config` |

---

## 3. Detailed Technical Diagnostics & Resolutions

### A. Switch #2 Authentication Bug (RFC 6265 Cookie Port-Scoping)
* **Symptom:** Browsing to `http://localhost:8888/login.cgi` (tunneled to default switch IP `192.168.2.1:80`) and submitting valid default credentials (`admin`/`admin`) caused the screen to flash and reload the blank login prompt indefinitely.
* **Under-the-Hood Root Cause:**
  1. Under RFC 6265, browser cookies do not isolate by TCP port number. Existing cookies from local development projects (TARS, Next.js, Docker) were shared on `localhost`.
  2. When submitting credentials, `login.cgi` set cookie `admin=<md5hash>` and returned JavaScript `window.top.location.replace("/")`.
  3. The browser requested `GET /` with multiple cookies: `Cookie: dev=123; admin=<md5hash>`.
  4. The embedded Realtek switch firmware uses a primitive C parser that expects `admin=` as the first token. When preceded by other cookies, the check failed, prompting a redirect back to `/login.cgi`.
  5. The `<body onload="SetBtnVal()">` script in `login.cgi` executed `document.cookie = "admin=";`, wiping the session cookie on landing and trapping the user in a redirect loop.
* **Resolution:**
  - Automated authentication via Python orchestration script (`reconfigure_switch2.py`).
  - Updated password to `AmirBarry24!` via POST to `/user.cgi`.
  - Migrated management IP to static `192.168.0.3` (Subnet: `255.255.255.0`, Gateway: `192.168.0.1`) via `/ip.cgi`.
  - Dispatched `cmd=save` to `/save.cgi` to write the configuration to flash NVRAM.
  - Terminated obsolete tunnel (`PID 12852`). Switch #2 is now natively accessible at `http://192.168.0.3/` and `http://switch2.local/`.

### B. TrueNAS SCALE SSH Automation (API 2.0)
* **Symptom:** Port 22 was closed on the TrueNAS node (`192.168.0.100`), preventing remote administration.
* **Resolution:**
  - Interfaced programmatically with TrueNAS REST API 2.0 using basic auth (`root:Kaylan38`).
  - Injected Amir's master public key (`ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIK2ZdMOIUi/TQYDX4WRRduJz3oN8Qk3PN19k5piGY35X amir-tse-lab`) via `PUT /api/v2.0/user/id/1`.
  - Enabled auto-start on boot via `PUT /api/v2.0/service/id/11` (`{"enable": true}`).
  - Initiated daemon via `POST /api/v2.0/service/start` (`{"service": "ssh"}`).
  - Validated passwordless root shell execution in 0.1s from Windows workstation.

### C. Alarm Media Pi 4 Configuration
* **System State:** Arch Linux ARM (`alarm`), Linux 6.6.x-aarch64.
* **Actions Taken:**
  - Installed `avahi` and `nss-mdns` via `pacman`.
  - Bound `avahi-daemon` to `end0` physical Ethernet interface and enabled the systemd unit.
  - Injected `id_ed25519.pub` into `/home/alarm/.ssh/authorized_keys` (permissions `0600`, directory `0700`).
  - Tested passwordless execution (`ssh alarm 'whoami'` $\rightarrow$ `alarm`).

### D. Switch & Router SSH Architecture Clarification
* **RealHD SW8-25G-MGV2 Switches:** These are web-smart Layer 2 managed switches. Their firmware does not include an OpenSSH or Dropbear daemon (Port 22 is closed). They are managed exclusively through HTTP Web GUI (`http://switch1.local/` and `http://switch2.local/`).
* **TP-Link ER605 Router:** The router's embedded Linux CLI only supports password authentication (`admin` / `Kaylan38`). Standalone mode firmware does not support custom public key authentication.

---

## 4. Workstation Configuration Files Modified

### 1. `C:\Users\Admin\.ssh\config`
```ssh-config
# ==============================================================================
# Amir Home Lab Master SSH Configuration
# Key: ~/.ssh/id_ed25519 (amir-tse-lab)
# ==============================================================================

# --- TARS Autonomous Node (Raspberry Pi 4) ---
Host tars tars.local
    HostName tars.local
    User admin
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes
    StrictHostKeyChecking accept-new

# --- Alarm Media & Cloud Node (Raspberry Pi 4 - Arch Linux ARM) ---
Host alarm alarm.local
    HostName 192.168.0.103
    User alarm
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes
    StrictHostKeyChecking accept-new

# --- TrueNAS SCALE Storage & Lab Node (Dell OptiPlex 755) ---
Host truenas truenas.local
    HostName 192.168.0.100
    User root
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes
    StrictHostKeyChecking accept-new

# --- TP-Link Omada ER605 v2 Router / Gateway ---
# Note: ER605 firmware requires password authentication (Kaylan38)
Host router er605 router.local
    HostName 192.168.0.1
    User admin
    StrictHostKeyChecking accept-new

# --- Termux Samsung S8 Android Node ---
Host s8
    HostName 10.0.0.238
    Port 8022
    User u0_a211
    IdentityFile ~/.ssh/s8_termux
    IdentitiesOnly yes
```

### 2. `C:\Windows\System32\drivers\etc\hosts`
```text
# ==============================================================================
# Amir Home Lab Master Infrastructure Host Mappings
# ==============================================================================
192.168.0.1      router.local er605.local router
192.168.0.2      switch1.local core-switch.local switch1
192.168.0.3      switch2.local work-switch.local switch2
192.168.0.100    truenas.local truenas
192.168.0.103    alarm.local alarm
192.168.0.104    tars.local tars
```

---

## 5. Immediate CLI Commands for the Next Agent

```bash
# Verify passwordless access to compute nodes:
ssh tars 'hostname; uptime'
ssh alarm 'hostname; uptime'
ssh truenas 'hostname; uptime'

# Test Web GUI endpoints:
curl -I http://switch1.local/login.cgi
curl -I http://switch2.local/login.cgi
curl -k -I https://router.local/
curl -k -I https://truenas.local/

# Verify media services on Alarm Pi:
curl -I http://alarm.local:2283        # Immich
curl -I http://alarm.local:32400/web   # Plex
curl -I http://alarm.local:9100/metrics # Node Exporter
```

---

## 6. Next Recommended Roadmap Items

1. **Router DHCP Reservations (ER605):** Configure static MAC $\rightarrow$ IP leases on ER605 for `tars` (`2C:CF:67:50:AB:4B`), `alarm` (`2C:CF:67:7D:BE:9C`), and `truenas` (`enp0s25`) to prevent DHCP lease migration.
2. **Switch L2 Configuration:** Set up VLAN tagging / Trunk links between ER605 Port 5 and Switch #1 / Switch #2 if segmentation is desired.
3. **TrueNAS Provisioning:** Wipe legacy pools on the OptiPlex 755 and configure container/virtualization runtimes.
4. **TARS Phase 9.4 Physical Presence:** Calibrate the touchscreen display on the Pi 4 for local kiosk operation.
