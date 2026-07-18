# Amir Home Lab Network Documentation

**Last Updated:** July 18, 2026
**Purpose:** Complete reference for home network topology, IP addressing, VPN access, services, and troubleshooting.

---

# 1. Network Overview

## High-Level Topology

```
                         INTERNET
                            |
                            |
                     Xfinity Gateway
                            |
                            |
                    Public IP (Dynamic)
                    Managed by DuckDNS
                            |
                            |
                    TP-Link Omada ER605
                    Router / VPN Gateway
                            |
                            |
                    Home LAN Network
                    192.168.0.0/24
                            |
                            |
                      Network Switch
                            |
        +-------------------+-------------------+
        |                   |                   |
        |                   |                   |
     TrueNAS              TARS Pi          Admin PC
   192.168.0.100       192.168.0.102      192.168.0.101
        |
        |
      Plex
```

---

# 2. Network Subnets

## Xfinity Gateway Network

**Purpose:**

* ISP modem/router network
* Provides internet access to ER605

```
Subnet:
10.0.0.0/24

Gateway:
10.0.0.1

ER605 WAN Address:
10.0.0.170
```

---

## Main Home LAN

**Managed by:**
TP-Link Omada ER605

```
Subnet:
192.168.0.0/24

Gateway:
192.168.0.1
```

All internal home lab devices live here.

---

## WireGuard VPN Network

**Purpose:**
Remote access into home LAN.

```
VPN Subnet:
10.10.0.0/24
```

---

# 3. Core Device Inventory

## TP-Link Omada ER605 Router

**Role:**

* Main router
* Firewall
* NAT gateway
* WireGuard VPN server

Firmware:

```
2.2.5 Build 20240522
```

WAN:

```
Interface:
WAN

IP:
10.0.0.170

Gateway:
10.0.0.1
```

LAN:

```
Network:
192.168.0.0/24
```

WireGuard:

```
Port:
51820 UDP

Status:
Enabled
```

---

# Xfinity Gateway

**Role:**

* ISP modem/router
* Internet connection
* Port forwarding to ER605

Current information:

```
Gateway:
10.0.0.1

ER605 Reserved IP:
10.0.0.170
```

Port Forward:

```
External Port:
51820

Protocol:
UDP

Forward To:
10.0.0.170
```

---

# 4. Device IP Address Map

## TrueNAS Server

```
Hostname:
truenas

IP:
192.168.0.100
```

Purpose:

* Storage server
* Plex server
* Media services
* Self-hosted applications

Services:

```
Plex:
32400

Other apps:
Radarr
Prowlarr
qBittorrent
```

---

## Admin Workstation

```
Hostname:
Amirwhitehat

IP:
192.168.0.101
```

Purpose:

* Network administration
* SSH management
* Configuration
* Troubleshooting

---

## TARS Raspberry Pi

```
Hostname:
tars

MAC:
2C:CF:67:50:AB:4B

IP:
192.168.0.102
```

Purpose:

* Automation
* API development
* Docker services
* Home lab experimentation
* Technical Support Engineer practice environment

Operating System:

```
Debian Linux
Raspberry Pi OS
aarch64
```

---

# 5. TARS Docker Services

Current containers:

## FastAPI Backend

```
Container:
tse_fastapi_backend

Port:
8000
```

Purpose:

* REST API development
* Backend testing

---

## PostgreSQL Database

```
Container:
tse_postgres_db

Port:
5432
```

Purpose:

* Application database

---

## DuckDNS

```
Container:
duckdns
```

Purpose:

* Dynamic DNS updater
* Keeps VPN reachable after public IP changes

---

# 6. DuckDNS Configuration

Purpose:

Automatically updates DNS when Xfinity changes the public IP address.

Hostname:

```
amirshomelab.duckdns.org
```

Current Public IP:

```
98.40.162.202
```

(Subject to change)

DNS verification:

```
nslookup amirshomelab.duckdns.org
```

Expected result:

```
98.40.162.202
```

---

# 7. WireGuard Configuration

## Laptop Client

Tunnel Address:

```
10.10.0.3/32
```

Allowed Networks:

```
192.168.0.0/24
10.10.0.0/24
```

Endpoint:

```
amirshomelab.duckdns.org:51820
```

Persistent Keepalive:

```
25 seconds
```

---

## WireGuard Purpose

Allows remote access to:

```
192.168.0.0/24 LAN
```

Traffic path:

```
Remote Laptop
        |
        |
WireGuard Tunnel
        |
        |
ER605 Router
        |
        |
Home LAN
        |
        +-- TrueNAS
        |
        +-- TARS
        |
        +-- Plex
```

---

# 8. Verified Working Tests

## Remote SSH Access

Command:

```
ssh admin@192.168.0.102
```

Status:

```
Working
```

---

## VPN Ping Test

Command:

```
ping 192.168.0.102
```

Result:

```
Reply received
```

VPN routing confirmed.

---

## DuckDNS Test

Command:

```
nslookup amirshomelab.duckdns.org
```

Result:

```
98.40.162.202
```

DNS working.

---

# 9. Troubleshooting Checklist

## Step 1 — Check DuckDNS

On TARS:

```
docker logs duckdns
```

Expected:

```
DuckDNS request successful
```

---

## Step 2 — Check WireGuard

ER605:

```
VPN
→ WireGuard
→ Peers
```

Verify:

```
Last Handshake
TX/RX increasing
```

---

## Step 3 — Check Port Forward

Xfinity:

```
UDP 51820

Forward:
10.0.0.170
```

---

## Step 4 — Check TARS

SSH:

```
ssh admin@192.168.0.102
```

---

## Step 5 — Test LAN Access Through VPN

```
ping 192.168.0.102
```

---

# 10. Future Improvements

## DHCP Reservations

Reserve:

```
TrueNAS:
192.168.0.100

Admin PC:
192.168.0.101

TARS:
192.168.0.102
```

---

## Local DNS

Create easier names:

```
truenas.home

tars.home

plex.home
```

Instead of remembering IP addresses.

---

## HTTPS / Reverse Proxy

Future goal:

```
https://tars.home

https://plex.home
```

with:

* Reverse proxy
* SSL certificates
* Internal service routing

---

# Current Status

✅ WireGuard VPN working
✅ DuckDNS dynamic DNS working
✅ Remote LAN access working
✅ TARS reachable remotely
✅ Docker services running
✅ Plex/network recovery complete

---

# Important Incident Notes

The original outage was caused by:

```
Xfinity modem/router replacement
```

which changed the public IP address.

WireGuard was still configured for the old public IP, causing failed handshakes.

Resolution:

```
Old:
98.198.161.11

New:
98.40.162.202
```

DuckDNS was installed to prevent this issue permanently.

Current solution:

```
amirshomelab.duckdns.org
        |
        |
Current Public IP
        |
        |
ER605 WireGuard VPN
```

The network is now reachable remotely without needing a physical Ethernet connection.
