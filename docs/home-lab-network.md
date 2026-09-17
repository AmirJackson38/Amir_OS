# Amir Home Lab Network & Master Infrastructure Documentation

**Last Updated:** September 3, 2026
**Status:** Alarm Media Pi 4 (Immich & Plex) Deployment & Active Topology Sync
**Purpose:** Comprehensive, authoritative technical reference for Amir's Home Lab network architecture, subnets, device inventory, service catalog, VPN topology, and troubleshooting procedures.

---

# 1. Network Topology & Subnet Architecture

## Dual-Router Network Model

The network uses a dual-router architecture separating the upstream ISP gateway network (`10.0.0.0/24`) from the isolated Home Lab LAN (`192.168.0.0/24`).

```
                                  INTERNET
                                     |
                                     v
                           XFINITY GATEWAY (Modem)
                              WAN IP: Dynamic
                         Public DNS: DuckDNS Tracking
                             LAN IP: 10.0.0.1
                              Subnet: 10.0.0.0/24
                                     |
             +-----------------------+-----------------------+
             | (10.0.0.0/24 Wi-Fi & Wired WAN Network)      |
             |                                               |
             v                                               v
    TP-LINK OMADA ER605 v2                              Wi-Fi / ISP Devices
    WAN IP: 10.0.0.170                                  - Apple iMac (10.0.0.190)
    LAN IP: 192.168.0.1                                 - Linux Device (10.0.0.7)
    Role: Main LAN Router/Firewall                     - Intel Device (10.0.0.112)
    WireGuard VPN: UDP 51820                            - Samsung Device (10.0.0.19)
             |
             | 192.168.0.0/24 Home Lab LAN
             v
   REALHD SW8-25G-MGV2
   Core LAN Switch (2.5GbE)
   LAN IP: 192.168.0.2
             |
   +---------+-----------------------+-----------------------+-----------------------+
   |                                 |                       |                       |
   v                                 v                       v                       v
TrueNAS Server                   TARS Raspberry Pi 4     Alarm Media Pi 4        Admin Workstation
Dell OptiPlex 755                Node (tars.local)       Arch Linux ARM (alarm)  Amirwhitehat
LAN IP: 192.168.0.100            LAN IP: 192.168.0.102*  LAN IP: 192.168.0.103   LAN IP: 192.168.0.101*
(Reconfiguring / Lab Node)       (TARS Face/Backend)     (2TB Ext SSD / Storage) (Workstation)
   |                                                     |
   +--> [Legacy OptiPlex Pool]                           +--> Immich (Port 2283)
                                                         +--> Plex (Port 32400)
                                                         +--> Node Exporter (Port 9100)
```

---

# 2. Subnet Definitions & Routing Tables

### 1. Upstream Xfinity Subnet (`10.0.0.0/24`)
* **Gateway:** `10.0.0.1`
* **Purpose:** ISP internet ingress, Wi-Fi access point network, upstream WAN interface for the home lab router.
* **ER605 WAN IP:** `10.0.0.170` (Static/Reserved on Xfinity Gateway)

### 2. Primary Home Lab LAN (`192.168.0.0/24`)
* **Gateway:** `192.168.0.1` (TP-Link Omada ER605 v2)
* **Switching:** RealHD SW8-25G-MGV2 (2.5GbE Core Switch)
* **Purpose:** Secure internal network for server infrastructure, storage arrays, container services, and administrative control.

### 3. WireGuard Remote VPN Subnet (`10.10.0.0/24`)
* **Gateway/Server:** TP-Link Omada ER605 v2 (`192.168.0.1`)
* **Listen Port:** UDP `51820` (Port forwarded on Xfinity Gateway to `10.0.0.170`)
* **DDNS Hostname:** `amirshomelab.duckdns.org`
* **Known Client Leases:**
  - `10.10.0.2/32` — iPhone Mobile Client (Immich / Remote Admin)
  - `10.10.0.3/32` — ThinkPad Admin Workstation (Amirwhitehat)
* **Allowed IPs:** `192.168.0.0/24`, `10.10.0.0/24`

---

# 3. Categorized Device Inventory

Data accuracy standard enforced:
* `CONFIRMED`: Verified via direct CLI command, interface inspection, or hardware MAC validation.
* `PREVIOUSLY DOCUMENTED`: Recorded in baseline architecture, pending active re-verification.
* `INFERRED`: Derived from heuristic evidence (e.g., Nmap fingerprints).
* `UNKNOWN`: Unverified device identity requiring further discovery.

| Device Name | Hardware / Model | Subnet / IP | MAC Address | Status | Notes & Services |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Xfinity Gateway** | Arris / Technicolor ISP Modem | `10.0.0.1` | — | `CONFIRMED` | Upstream ISP Gateway & Wi-Fi AP |
| **TP-Link Omada ER605 v2** | Enterprise Multi-WAN Router | WAN: `10.0.0.170`<br>LAN: `192.168.0.1` | — | `CONFIRMED` | LAN Router, Firewall, WireGuard VPN Server. Web UI: `https://192.168.0.1` (`admin` / `Kaylan38`). |
| **RealHD 2.5GbE Switch #1** | RealHD SW8-25G-MGV2 | `192.168.0.2` | `1C:2A:A3:2F:2B:73` | `CONFIRMED` | 8-Port 2.5GbE Managed Core Switch. Connected to ER605 LAN. Web UI: `http://192.168.0.2/` (`admin` / `AmirBarry24!`). |
| **RealHD 2.5GbE Switch #2** | RealHD SW8-25G-MGV2 | `192.168.0.3` | `1C:2A:A3:2F:2B:43` | `CONFIRMED` | 8-Port 2.5GbE Switch serving Work PC. Connected to ER605 Port 5. Web UI: `http://192.168.0.3/` (`admin` / `AmirBarry24!`). Reconfigured from default `192.168.2.1`, committed to flash. |
| **TrueNAS / Lab Node** | Dell OptiPlex 755 (Serial: `HQRN4H1`) | `192.168.0.100` | Interface: `enp0s25` | `CONFIRMED` | TrueNAS SCALE 24.04.2.5. Intel Core 2 Duo E6550 (2C/2.33GHz), ~6GB RAM, 80GB boot HDD + 320GB data HDD. Web UI: `https://192.168.0.100` (`root` / `Kaylan38`). SSH: Disabled. Target: Re-provision as Container Lab. |
| **Alarm Media Pi 4** | Raspberry Pi 4 Model B (4GB) | `192.168.0.103` | `2C:CF:67:7D:BE:9C` (eth)<br>`2C:CF:67:7D:BE:9F` (wlan) | `CONFIRMED` | Arch Linux ARM (`alarm`). Media & Cloud server. 2TB Lexar SSD ext4 at `/mnt/storage`. Hosts Immich (`:2283`), Plex (`:32400`), Node Exporter (`:9100`). SSH: `alarm` / `Kaylan38`. |
| **Apple iMac / Mac** | Apple Desktop | `10.0.0.190` | `EC:35:86:52:A2:7C` | `CONFIRMED` | Apple MAC Vendor. Open ports: Kerberos (88), EPPC (3031), Apple Remote Desktop VNC (5900), 6881, 49152. |
| **Linux Device** | Unknown SBC / PC | `10.0.0.7` | Interface: `wlan0` | `UNKNOWN` | `wlan0` UP (`10.0.0.7`), `eth0` DOWN. Pending identity confirmation (potential Pi on Wi-Fi). |
| **Intel System** | Intel Hardware | `10.0.0.112` | `9C:FC:E8:30:18:3A` | `UNKNOWN` | Intel MAC Vendor. TCP 9002 (WebSocket++ 0.8.2). **NOT TrueNAS**. |
| **Samsung Device** | Samsung Hardware | `10.0.0.19` | `70:09:71:8A:F5:4C` | `UNKNOWN` | Samsung MAC Vendor. Open ports: 4000, 8001, 8002, 8080 (HTTP), 9080. Likely Smart TV or Mobile. |
| **TARS Raspberry Pi 4** | RPi 4 4GB/8GB | `192.168.0.102`* | `2C:CF:67:50:AB:4B` | `CONFIRMED` | TARS Autonomous Node (`tars.local`). Docker Node: `tars_backend` (:8080), TSE FastAPI (:8000), Postgres (:5432), DuckDNS. Ethernet to switch. |
| **Admin Workstation** | Amirwhitehat Windows PC | `192.168.0.101`* | — | `PREVIOUSLY DOCUMENTED` | Workstation used for SSH management & Nmap scans (currently operating on Wi-Fi `10.0.0.x` segment). |

---

# 3a. Hardware Specifications & Data Transfer Performance

## Workstation Hardware
### Admin Workstation (Amirwhitehat)
- **Model:** Lenovo ThinkPad E15 Gen 1 (BIOS: R11ET45W)
- **CPU:** AMD Ryzen 5 3500U (2.10 GHz, Vega Mobile Gfx)
- **RAM:** 8.00 GB (5.89 GB usable)
- **Graphics:** AMD Radeon Vega 8 Graphics (2 GB)
- **Storage:** 238 GB total (154 GB used)
- **OS:** Windows 10/11 64-bit

**USB Port Specifications:**
| Port | Location | Spec | Speed | Use Case |
| :--- | :--- | :--- | :--- | :--- |
| Left USB-A #1 | Left side | USB 3.0 + SuperSpeed | 5 Gbps (~500 MB/s practical) | **Recommended for external drives** |
| Left USB-A #2 | Left side | USB 3.0 + SuperSpeed + Powered | 5 Gbps (~500 MB/s practical) | **Recommended (charges devices when off)** |
| Right USB-A | Right side | USB 2.0 | 480 Mbps (~60 MB/s practical) | **Avoid for storage** |
| USB-C | Power Port | Power-only (no data) | — | Charging only |

---

## Storage Hardware

### Seagate BarraCuda 8TB Internal HDD (×2)
- **Specification:** 3.5" SATA 6 Gb/s, 5400 RPM, 256 MB cache
- **Practical Speed:** ~140-160 MB/s sequential read/write
- **Deployment:** 2× units installed in WavLink 4-bay enclosure
- **Purpose:** Redundant storage for media, backups, and home lab datasets

### WavLink 4-Bay External Enclosure
- **Interface:** USB 3.2 Gen 1 (10 Gbps capable = 1.25 GB/s theoretical)
- **Features:** Temp-controlled cooling fans, aluminum shell, 4K HDMI output
- **Current Capacity:** 16 TB (2× 8TB BarraCuda drives installed, 2 bays available)
- **Connection Method:** USB-C to Admin Workstation (left USB 3.0 Type-A port)

**Data Transfer Bottleneck Analysis:**
- WavLink enclosure (10 Gbps USB 3.2) → Admin PC USB 3.0 (5 Gbps) = **5 Gbps is the limiting factor**
- Expected practical transfer rate: **400-500 MB/s** (limited by Ryzen 5 3500U USB 3.0 controller)
- Individual drives max out at ~160 MB/s, so enclosure can sustain 2× drive simultaneous access at LAN speeds

---

## Raspberry Pi Hardware

### Vilros Raspberry Pi 4 4GB Basic Start Kit (×2)
- **Model:** Raspberry Pi 4 Model B, 4GB RAM
- **CPU:** Broadcom BCM2711 (ARM Cortex-A72, 1.5 GHz quad-core)
- **Storage:** Amazon Basics microSD XC, 100 MB/s speed class, 128 GB (×2)
- **Case:** MiuZei case with cooling fans (clear acrylic, ×2)
- **USB:** 4× USB 3.0 Type-A ports per Pi (5 Gbps capable)
- **Ethernet:** 1 Gbps Gigabit Ethernet (per Pi)

**Connected Displays (×2 units each):**
1. **Hosyond 5" Touchscreen** (MIPI DSI Interface)
   - Resolution: 800×480 pixels
   - Type: IPS, capacitive touch
   - Driver: Driverfree interface
   - Use Case: Primary UI/monitoring on one Pi

2. **Hosyond 3.5" Touchscreen** (SPI Interface)
   - Resolution: 480×320 pixels
   - Type: TFT LCD
   - Driver: SPI panel
   - Use Case: Secondary/compact display on second Pi

**Deployment Notes:**
- Both Pi 4s connected via Ethernet (Cat 8 cables) to ER605 LAN switch
- MicroSD cards provide 128 GB local storage per Pi (adequate for OS + containerized services)
- Dual displays enable side-by-side monitoring/dashboarding capability

---

## Network Infrastructure Hardware

### Cabling
- **Ethernet Cables:** dbillionDa Cat 8 with gold-plated tips (×multiple)
  - **Standard:** Category 8 (40 Gbps rated, but home lab uses 1-2.5 GbE)
  - **Current Usage:** All connected devices use Cat 8 (future-proof infrastructure)
  - **Practical Benefit:** Ensures zero network bottleneck; overkill but guaranteed performance

### Switch
- **RealHD SW8-25G-MGV2:** 8-Port 2.5GbE Managed Core Switch
- **Management IP:** `192.168.0.2` (Web UI: `http://192.168.0.2/`)
- **Credentials:** `admin` / `AmirBarry24!`
- **Ports:** 8 managed ports @ 2.5 Gbps each
- **Function:** Core LAN switching for TrueNAS, TARS Pi, Alarm Pi, Admin PC, and future devices

---

## Performance Summary Table

| Component | Theoretical Max | Practical Sustained | Bottleneck |
| :--- | :--- | :--- | :--- |
| **WavLink Enclosure** | 10 Gbps (USB 3.2) | 1.25 GB/s | — |
| **Admin PC USB 3.0 Ports** | 5 Gbps | ~500 MB/s | Workstation controller |
| **Seagate BarraCuda 8TB** (each) | 6 Gbps (SATA) | ~160 MB/s | Drive speed |
| **Raspberry Pi 4 USB 3.0** | 5 Gbps | ~500 MB/s | Pi USB controller |
| **Raspberry Pi 4 Ethernet** | 1 Gbps | ~125 MB/s | Gigabit limit |
| **Cat 8 Cabling** | 40 Gbps | Not reached | Infrastructure overspecced |
| **ER605 Router LAN Port** | 1 Gbps | ~125 MB/s | ISP/home LAN standard |

**Key Insight:** The infrastructure is well-designed for growth. USB 3.2 enclosure and Cat 8 cabling will support future device upgrades without replacement.

---

# 4. Service Catalog & Port Forwarding Matrix

## Public / WAN Ingress Rules (Xfinity Gateway → ER605)
```
[Internet Client] ---> [Xfinity WAN IP] ---> [Port Forward: UDP 51820] ---> [ER605 WAN 10.0.0.170:51820] ---> [WireGuard VPN Tunnel]
```

## Internal Services Overview

### 1. TrueNAS / Lab Node (`192.168.0.100`) — Dell OptiPlex 755
* **OS:** TrueNAS SCALE 24.04.2.5 (Debian 12 base)
* **Web UI:** `https://192.168.0.100` (Ports 80/443)
* **Web Admin:** `root` (or `admin`) | Password: `Kaylan38`
* **SSH Status:** Currently STOPPED (Port 22 closed; enable via Web UI $\rightarrow$ System Settings $\rightarrow$ Services $\rightarrow$ SSH)
* **Hardware Specs (Live Verified):**
  - CPU: Intel Core 2 Duo E6550 @ 2.33 GHz (2 cores, 2 threads, 64-bit)
  - RAM: 5.66 GB usable (~6 GB DDR2)
  - Disks: 1× 80 GB HDD (`sdb` - boot), 1× 320 GB HDD (`sda` - data)
  - Pool: `Data Pool 1` (Status: OFFLINE)
* **Status:** Slated for wipe & re-provisioning as a container testing lab.

### 2. TARS Automation Node (`192.168.0.102` / `tars.local`)
* **SSH Access:** `ssh admin@tars.local` | Auth: Passwordless SSH Key (`~/.ssh/id_ed25519`) + Passwordless `sudo`
* **TARS Face / Backend Runtime:** TCP `8080` (Container: `tars_backend`)
* **FastAPI TSE Backend:** TCP `8000` (Container: `tse_fastapi_backend`)
* **PostgreSQL Database:** TCP `5432` (Container: `tse_postgres_db`)
* **DuckDNS Dynamic DNS Client:** Background Service (Container: `duckdns`) — Keeps `amirshomelab.duckdns.org` linked to current dynamic public IP.

### 3. Alarm Media & Cloud Node (`192.168.0.103` / `alarm`)
* **OS:** Arch Linux ARM (Linux alarm 6.6.x-aarch64)
* **SSH Access:** `ssh alarm@192.168.0.103` | User: `alarm` | Password: `Kaylan38`
* **Attached Storage:** 2TB Lexar External SSD (`/dev/sda1` ext4, label `storage`) mounted at `/mnt/storage`
* **Timezone:** `America/Chicago` (CDT, UTC-5)

#### Services:
1. **Immich Photo & Video Cloud** (`/mnt/storage/services/immich/`):
   * **Web UI / Mobile API:** TCP `2283` (`http://192.168.0.103:2283`)
   * **Admin Account:** `amirjacksonmusic@gmail.com`
   * **Admin Password:** `AmirBarry24!`
   * **Database:** PostgreSQL 14 with VectorChord (`ghcr.io/immich-app/postgres:14-vectorchord0.4.3-pgvectors0.2.0`)
     - Internal Port: `5432`
     - DB Name: `immich` | DB User: `postgres` | DB Password: `postgres`
     - Host Volume: `/mnt/storage/immich/postgres:/var/lib/postgresql/data`
   * **Machine Learning Server:** `immich_machine_learning` (`ghcr.io/immich-app/immich-machine-learning:release`)
     - Internal Port: `3003`
     - Host Volume: `/mnt/storage/immich/model-cache:/cache`
   * **Redis Cache:** `immich_redis` (`redis:6.2-alpine`)
     - Internal Port: `6379`
   * **Upload Library:** `/mnt/storage/immich/library:/data`

2. **Plex Media Server** (`/mnt/storage/services/plex/`):
   * **Web UI:** TCP `32400` (`http://192.168.0.103:32400/web`)
   * **Network Mode:** `host`
   * **Storage Mappings:**
     - Config: `/mnt/storage/config/plex:/config`
     - TV Shows: `/mnt/storage/media/tv:/tv`
     - Movies: `/mnt/storage/media/movies:/movies`
     - Music: `/mnt/storage/media/music:/music`

3. **Node Exporter Host Monitoring** (`/mnt/storage/services/monitoring/`):
   * **Metrics Endpoint:** TCP `9100` (`http://192.168.0.103:9100/metrics`)
   * **Network Mode:** `host`
   * **Host Mount:** `/:/host:ro,rslave`

---

# 4a. Master Credentials & Access Matrix

Authoritative inventory of homelab administrative access, ports, protocols, and known credentials:

| Device / Service | Host / IP / Endpoint | Protocol / Port | Username | Password / Auth Key | Verification Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Alarm Media Pi 4** | `alarm.local` (`192.168.0.103`) | SSH (22) | `alarm` | Passwordless Key (`~/.ssh/id_ed25519`) + sudo: `Kaylan38` | `VERIFIED` (Passwordless SSH active) |
| **Immich Web UI / App** | `http://192.168.0.103:2283` | HTTP (2283) | `amirjacksonmusic@gmail.com` | `AmirBarry24!` | `VERIFIED` |
| **Immich PostgreSQL** | Internal Docker (`192.168.0.103`) | TCP (5432) | `postgres` | `postgres` (DB: `immich`) | `VERIFIED` |
| **Plex Media Server** | `http://192.168.0.103:32400/web` | HTTP (32400) | Plex Account | OAuth / Plex login | `CONFIRMED` |
| **Node Exporter** | `http://192.168.0.103:9100/metrics` | HTTP (9100) | None | Unauthenticated metrics | `VERIFIED` |
| **TARS Autonomous Pi** | `tars.local` (`192.168.0.104`) | SSH (22) | `admin` | Passwordless Key (`~/.ssh/id_ed25519`) + Passwordless sudo | `VERIFIED` |
| **TrueNAS SCALE Web UI** | `https://192.168.0.100` | HTTPS (443 / 80) | `root` (or `admin`) | `Kaylan38` | `VERIFIED` (API 2.0 Auth Pass) |
| **TrueNAS SSH** | `truenas.local` (`192.168.0.100`) | SSH (22) | `root` | Passwordless Key (`~/.ssh/id_ed25519`) | `VERIFIED` (Enabled via API 2.0, active) |
| **ThinkPad WireGuard** | `10.10.0.3/32` | UDP (51820) | Client Peer | PrivateKey in config | `VERIFIED` (Active handshake) |
| **iPhone WireGuard** | `10.10.0.2/32` | UDP (51820) | Client Peer | PrivateKey in iOS app | `VERIFIED` (Active handshake) |
| **Samsung S8 Node** | `10.0.0.238` | SSH (8022) | `u0_a211` | SSH Key (`~/.ssh/s8_termux`) | `CONFIGURED` in `~/.ssh/config` |
| **TP-Link ER605 Router** | `https://192.168.0.1` / `10.0.0.170` | HTTPS / HTTP | `admin` | `Kaylan38` | `CONFIRMED` |
| **RealHD 2.5GbE Switch #1** | `http://192.168.0.2/` | HTTP (80) | `admin` | `AmirBarry24!` | `VERIFIED` (Port 80 confirmed active) |
| **RealHD 2.5GbE Switch #2** | `http://192.168.0.3/` | HTTP (80) | `admin` | `AmirBarry24!` | `VERIFIED` (Port 5 on ER605, LAN IP & NVRAM saved) |
| **Xfinity Gateway** | `http://10.0.0.1` | HTTP/HTTPS | `admin` | **GAP: Missing from docs** | `PENDING DOCUMENTATION` |
| **Apple iMac Desktop** | `10.0.0.190` | VNC (5900) / SSH | macOS User | **GAP: Missing from docs** | `PENDING DOCUMENTATION` |
| **Linux Host (10.0.0.7)** | `10.0.0.7` | SSH (22) | `amir` | **GAP: Missing from docs** | `PENDING DOCUMENTATION` |

---

# 5. Remote VPN Architecture & Flow

```
Remote Clients: iPhone (10.10.0.2/32) | Workstation (10.10.0.3/32)
            |
            | WireGuard Tunnel (UDP 51820)
            | Virtual Subnet: 10.10.0.0/24
            v
Public Domain: amirshomelab.duckdns.org
            |
            v
Upstream Xfinity Gateway (10.0.0.1)
            | (Port Forward UDP 51820)
            v
TP-Link Omada ER605 v2 (10.0.0.170 WAN / 192.168.0.1 LAN)
            |
            +===> Access to Home Lab LAN Subnet (192.168.0.0/24)
                    |
                    +---> Alarm Media Pi / Immich / Plex (`192.168.0.103`)
                    +---> TARS Node (`192.168.0.102` / `tars.local`)
                    +---> TrueNAS / Lab Node (`192.168.0.100`)
                    +---> Admin PC (`192.168.0.101`)
```

---

# 6. Technical Support Engineer (TSE) Diagnostic & Troubleshooting Log

### Incident Analysis & Reconnaissance Lessons (July 23, 2026)

1. **Subnet Misalignment during Reconnaissance:**
   * *Symptom:* Nmap scans executed from the Wi-Fi workstation targeted `10.0.0.0/24`, discovering non-LAN nodes.
   * *Root Cause:* The admin PC was associated with the Xfinity Wi-Fi network (`10.0.0.x`), upstream of the ER605 router, rather than the internal `192.168.0.0/24` LAN segment.
   * *Resolution:* Clear distinction established between WAN-side Wi-Fi nodes and LAN infrastructure nodes.

2. **TrueNAS IP Address Verification:**
   * *Verification Command:* `hostname -I` on TrueNAS shell returned `192.168.0.100`.
   * *Routing Verification:* `ip route` confirmed default gateway `192.168.0.1` via physical interface `enp0s25`.
   * *Distinction:* `172.16.0.0/16` (`kube-bridge`) addresses are Kubernetes container overlay networks, not physical LAN IPs.

3. **Nmap Syntax Safety in PowerShell:**
   * *Operational Warning:* Copy-pasting raw Nmap output containing characters like `<` or `|` directly into PowerShell triggers command parse errors. Scan outputs must be piped to text files or logged cleanly.

4. **Embedded Web Server Cookie Port-Scoping & Firmware Parser Flaw (RealHD Switch #2):**
   * *Symptom:* Entering correct credentials at `http://localhost:8888/login.cgi` (tunneled to default switch IP `192.168.2.1`) caused the login screen to flash and refresh back to an unauthenticated prompt without error.
   * *Root Cause (Security+ & RFC 6265):* Browser cookies do not isolate by port. Pre-existing development cookies scoped to `localhost` were sent in the `Cookie:` header. The embedded Realtek switch CGI parser expects `admin=` as the first token; when preceded by other cookies, it failed to parse the auth token, returned a redirect to `/login.cgi`, whose `onload` event (`SetBtnVal()`) wiped the session cookie.
   * *Resolution & Migration:* Authenticated via scripted session, updated switch password to `AmirBarry24!`, reconfigured management IP to static `192.168.0.3` (Gateway `192.168.0.1`), and committed configuration to flash NVRAM (`save.cgi`). Switch #2 is now natively reachable at `http://192.168.0.3/` without tunneling or cookie collisions.

---

# 7. Action Plan & Next Steps

1. **Host Verification (Device `10.0.0.7`):**
   * SSH or physically check device hostname (`hostname`) and serial/model to determine if it is the Raspberry Pi 4 on Wi-Fi or a secondary Linux node.

2. **DHCP Reservation Implementation:**
   * Configure static DHCP reservations on TP-Link Omada ER605 v2:
     * TrueNAS Server → `192.168.0.100` (MAC based)
     * TARS Raspberry Pi (`tars`) → `192.168.0.102` (MAC: `2C:CF:67:50:AB:4B`)
     * Alarm Media Pi 4 (`alarm`) → `192.168.0.103` (MAC: `2C:CF:67:7D:BE:9C`)
     * Admin Workstation → MAC based reservation

3. **Identification of Unmapped Devices:**
   * Inspect DHCP lease table on Xfinity Gateway for MAC addresses `9C:FC:E8:30:18:3A` (Intel `10.0.0.112`) and `70:09:71:8A:F5:4C` (Samsung `10.0.0.19`).

4. **Master Architecture Map Sync:**
   * Update Draw.io visual diagrams to reflect verified subnets and device categories.

---

# 8. TARS Networking & Deployment Reliability

A networking weakness was exposed when relying on assumed IP addresses (like `192.168.0.102`) for TARS deployment. The Raspberry Pi's network interfaces (Ethernet and WiFi) present different MAC addresses and receive different DHCP leases, which breaks hardcoded IP assumptions.

### Deployment Truths & Rules
* **Primary SSH Method:** `ssh admin@tars.local`
* **Do NOT assume:** `192.168.0.102` (or any static IP until explicitly reserved on the ER605 router).
* **DHCP Leases:** IP addresses may change dynamically when interfaces switch (e.g., Ethernet to WiFi) or leases expire.
* **DuckDNS Scope:** DuckDNS (`amirshomelab.duckdns.org`) strictly manages external WAN access and does **not** manage local LAN discovery.

### Future Network Migration Plan
To improve homelab reliability, the network must evolve in phases:

* **Phase 1 (Current):** Rely strictly on mDNS hostname discovery (`tars.local`) for SSH and deployment, bypassing dynamic DHCP IP issues.
* **Phase 2 (Recommended ER605 Setup):** Create router DHCP reservations based on MAC address for critical infrastructure (TARS Pi, Home Assistant Pi, TrueNAS server).
* **Phase 3 (Production):** Complete static IP assignments for all critical homelab servers. *Avoid manually configuring static IPs on the end devices themselves until the final network layout is completed.*
