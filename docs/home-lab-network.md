# Amir Home Lab Network & Master Infrastructure Documentation

**Last Updated:** July 23, 2026  
**Status:** Verification & Reconnaissance Update  
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
             |
   +---------+-----------------------+-----------------------+
   |                                 |                       |
   v                                 v                       v
TrueNAS Server                   TARS Raspberry Pi 4     Admin Workstation
Dell OptiPlex 755                Node                    Amirwhitehat
LAN IP: 192.168.0.100            LAN IP: 192.168.0.102*  LAN IP: 192.168.0.101*
(Confirmed via `hostname -I`)    (Ethernet / Pre-doc)    (Historical LAN IP)
   |
   +--> Plex (Port 32400)
   +--> Radarr / Prowlarr
   +--> qBittorrent
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
* **Known Client Lease:** `10.10.0.3/32` (Remote Laptop / Mobile)
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
| **TP-Link Omada ER605 v2** | Enterprise Multi-WAN Router | WAN: `10.0.0.170`<br>LAN: `192.168.0.1` | — | `CONFIRMED` | LAN Router, Firewall, WireGuard VPN Server |
| **TrueNAS Storage Server** | Dell OptiPlex 755 | `192.168.0.100` | Interface: `enp0s25` | `CONFIRMED` | Verified via `hostname -I` & `ip route`. Hosts Plex (32400), Radarr, Prowlarr, qBittorrent. Internal Kube bridge `172.16.0.0/16`. |
| **Apple iMac / Mac** | Apple Desktop | `10.0.0.190` | `EC:35:86:52:A2:7C` | `CONFIRMED` | Apple MAC Vendor. Open ports: Kerberos (88), EPPC (3031), Apple Remote Desktop VNC (5900), 6881, 49152. |
| **Linux Device** | Unknown SBC / PC | `10.0.0.7` | Interface: `wlan0` | `UNKNOWN` | `wlan0` UP (`10.0.0.7`), `eth0` DOWN. Pending identity confirmation (potential Pi on Wi-Fi). |
| **Intel System** | Intel Hardware | `10.0.0.112` | `9C:FC:E8:30:18:3A` | `UNKNOWN` | Intel MAC Vendor. TCP 9002 (WebSocket++ 0.8.2). **NOT TrueNAS**. |
| **Samsung Device** | Samsung Hardware | `10.0.0.19` | `70:09:71:8A:F5:4C` | `UNKNOWN` | Samsung MAC Vendor. Open ports: 4000, 8001, 8002, 8080 (HTTP), 9080. Likely Smart TV or Mobile. |
| **TARS Raspberry Pi 4** | RPi 4 4GB/8GB | `192.168.0.102`* | `2C:CF:67:50:AB:4B` | `PREVIOUSLY DOCUMENTED` | Docker Node: TSE FastAPI (8000), Postgres (5432), DuckDNS Updater. Ethernet connection to switch. |
| **Admin Workstation** | Amirwhitehat Windows PC | `192.168.0.101`* | — | `PREVIOUSLY DOCUMENTED` | Workstation used for SSH management & Nmap scans (currently operating on Wi-Fi `10.0.0.x` segment). |

---

# 4. Service Catalog & Port Forwarding Matrix

## Public / WAN Ingress Rules (Xfinity Gateway → ER605)
```
[Internet Client] ---> [Xfinity WAN IP] ---> [Port Forward: UDP 51820] ---> [ER605 WAN 10.0.0.170:51820] ---> [WireGuard VPN Tunnel]
```

## Internal Services Overview

### 1. TrueNAS Storage & Media Stack (`192.168.0.100`)
* **Plex Media Server:** TCP `32400`
* **Radarr (Movie Management):** TCP `7878`
* **Prowlarr (Indexer Integration):** TCP `9696`
* **qBittorrent (Torrent Client):** TCP `8080` / Custom WebUI

### 2. TARS Automation Node (`192.168.0.102` / `tars`)
* **FastAPI TSE Backend:** TCP `8000` (Container: `tse_fastapi_backend`)
* **PostgreSQL Database:** TCP `5432` (Container: `tse_postgres_db`)
* **DuckDNS Dynamic DNS Client:** Background Service (Container: `duckdns`) — Keeps `amirshomelab.duckdns.org` linked to current dynamic public IP.

---

# 5. Remote VPN Architecture & Flow

```
Remote Workstation / iPhone
            |
            | WireGuard Tunnel (UDP 51820)
            | Virtual IP: 10.10.0.3/32
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
                    +---> TrueNAS / Plex (`192.168.0.100`)
                    +---> TARS Node (`192.168.0.102`)
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

---

# 7. Action Plan & Next Steps

1. **Host Verification (Device `10.0.0.7`):**
   * SSH or physically check device hostname (`hostname`) and serial/model to determine if it is the Raspberry Pi 4 on Wi-Fi or a secondary Linux node.

2. **DHCP Reservation Implementation:**
   * Configure static DHCP reservations on TP-Link Omada ER605 v2:
     * TrueNAS Server → `192.168.0.100`
     * TARS Raspberry Pi → `192.168.0.102`
     * Admin Workstation → `192.168.0.101`

3. **Identification of Unmapped Devices:**
   * Inspect DHCP lease table on Xfinity Gateway for MAC addresses `9C:FC:E8:30:18:3A` (Intel `10.0.0.112`) and `70:09:71:8A:F5:4C` (Samsung `10.0.0.19`).

4. **Master Architecture Map Sync:**
   * Update Draw.io visual diagrams to reflect verified subnets and device categories.
