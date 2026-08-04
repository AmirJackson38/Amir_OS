# PHASE 9.4 IMPLEMENTATION REPORT

TARS Physical Presence Layer — kiosk appliance conversion of the headless Raspberry Pi node.

**Date**: 2026-08-04
**Node**: `tars` — Raspberry Pi 4 Model B Rev 1.5 · Debian 13 (trixie) · kernel 6.12.47+rpt-rpi-v8
**Display**: Hosyond DSI touchscreen (800x480) — detected as `card1-DSI-1`
**Touch**: `10-0038 generic ft5x06` (event4) — `edt_ft5x06` driver
**Baseline commit (Phase 9.3)**: deployment live and verified prior to this phase

---

## Objective

Turn the headless node into an appliance that boots directly into the TARS frontend on the DSI touchscreen — no login prompt, no keyboard, full auto-recovery — while leaving every existing homelab service untouched.

---

## Success Criteria — Status

| Criterion | Result |
|---|---|
| No login prompt on power-on | ✅ Compositor owns the display from boot |
| No manual commands | ✅ Fully automatic via systemd |
| No keyboard required | ✅ Touch is the only input |
| TARS appears automatically | ✅ Chromium kiosk on `http://127.0.0.1:8080/` |
| Touch works | ✅ Validated end-to-end |
| Backend reconnects automatically | ✅ Client-side WS auto-reconnect + localhost serving |
| Docker survives reboot | ✅ `restart: unless-stopped` — all 8 containers healthy |
| Existing homelab untouched | ✅ No existing service modified |
| SSH fully functional | ✅ Unchanged on port 22 |

---

## Installed Packages

| Package | Version | Purpose |
|---|---|---|
| `chromium` | 1:150.0.7871.181-1~deb13u1+rpt1 | Kiosk browser (native Wayland, `--ozone-platform=wayland`) |
| `labwc` | 0.9.8-1+rpt1 | Minimal Wayland compositor (wlroots), no desktop environment |
| `seatd` | 0.9.1-1 | Seat/DRM access daemon so the compositor runs unprivileged |

No desktop environment, no display manager, no X server installed. `chromium` + `labwc` pull only their required Wayland runtime dependencies.

---

## Created Files

### 1. Kiosk session launcher — `/etc/tars-kiosk/kiosk-session.sh`

Runs as the `labwc --session` command. Waits up to 120s for the TARS backend on `http://127.0.0.1:8080/`, then `exec`s Chromium with hardened kiosk flags. Exits when Chromium exits, which terminates labwc, which lets systemd restart the whole stack.

Kiosk flags applied:
- `--kiosk --start-fullscreen --window-position=0,0 --window-size=800,480` — fullscreen, no tabs, no browser UI
- `--no-restore-session-state --no-first-run --disable-session-crashed-bubble` — no restore prompts
- `--disable-component-update --check-for-update-interval=31536000` — no update dialogs
- `--disable-crash-reporter --noerrdialogs --disable-infobars` — no crash bubbles / infobars
- `--disable-background-networking --disable-sync` — quiet, offline-first
- `--disable-pinch --touch-events=enabled` — touch-optimized
- No screensaver / no power-saving / no display sleep: labwc (wlroots) does not blank by default, and Chromium receives no blanking/power events
- Optional `TARS_KIOSK_DEBUG_PORT` env enables CDP remote debugging on 127.0.0.1 (default off)

### 2. Systemd unit — `/etc/systemd/system/tars-kiosk.service`

```ini
[Unit]
Description=TARS kiosk (labwc + Chromium) on DSI touchscreen
Wants=network-online.target
After=network-online.target docker.service seatd.service
StartLimitIntervalSec=0

[Service]
Type=simple
User=kiosk
Group=kiosk
Environment=XDG_RUNTIME_DIR=/run/user/996
ExecStart=/usr/bin/labwc --session /etc/tars-kiosk/kiosk-session.sh
Restart=always
RestartSec=3

[Install]
WantedBy=graphical.target
```

- Runs as dedicated `kiosk` user (uid 996, groups `video`, `input`, `render`) — never root, Chromium sandbox intact
- `Restart=always` + `StartLimitIntervalSec=0` — infinite self-heal
- Logs everything through `journalctl -u tars-kiosk.service`
- Independent of all containers; `After=docker.service` only orders startup

### 3. Runtime dir provisioner — `/etc/tmpfiles.d/tars-kiosk.conf`

```
d /run/user/996 0700 kiosk kiosk -
```

Creates `XDG_RUNTIME_DIR` at boot via `systemd-tmpfiles` (survives reboots; /run is tmpfs). An `ExecStartPre` equivalent failed inside the service namespace during the boot sequence — tmpfiles.d is the reliable fix.

### 4. Dedicated user

`kiosk` system user (uid 996, nologin shell, home `/var/lib/tars-kiosk`). Chromium profile at `/var/lib/tars-kiosk/chromium`.

### 5. Boot configuration

- `systemctl set-default graphical.target`
- `tars-kiosk.service` enabled → `graphical.target.wants/tars-kiosk.service`
- `seatd` enabled (multi-user, active)

---

## Verification Results

### Phase 9.4.1 — Graphical stack
- ✅ `chromium --version` = Chromium 150.0.7871.181; `labwc --version` = 0.9.8
- ✅ No package conflicts (clean apt transaction)
- ✅ labwc DRM init on `/dev/dri/card1` (vc4): 6 CRTCs, 60 planes, DSI-1 connected 800x480, hardware GLES3.1 renderer **V3D 4.2.14.0** (no software fallback)
- ✅ Chromium headless loaded TARS page (title "T.A.R.S. World v0.4 — Embodiment System")
- ✅ All 8 Docker containers healthy throughout

### Phase 9.4.2 — Kiosk launcher
- ✅ Full session launched; CDP reported `window.innerWidth=800, innerHeight=480` (exact panel fullscreen)
- ✅ Page render captured to PNG (147–150 KB — substantive scene, not blank frame)
- ✅ No browser UI, no restore/update/crash UI flags all active

### Phase 9.4.3 — Systemd service
- ✅ `tars-kiosk.service` active, Chromium spawned with all kiosk flags
- ✅ Auto-restart verified; output routed to journald
- ✅ CDP debug port disabled in production (verified `CDP_OFF`)

### Phase 9.4.4 — Boot
- ✅ `graphical.target` default, service enabled
- ✅ Clean reboot → kiosk active, no restart loop, renderers up, backend 200, Docker healthy, SSH up
- ✅ Fullscreen render confirmed on booted system (800x480, screenshot stored in docs)

### Phase 9.4.5 — Touch
- ✅ Input device configured by libinput: `Adding 10-0038 generic ft5x06 (00)` on seat
- ✅ Coordinate ranges **X 0–799, Y 0–479** — exactly 1:1 with the 800x480 panel → native orientation, **no rotation, no inversion**
- ✅ Idle ghost-touch check: 0 spurious events over 5s
- ✅ Synthetic end-to-end touch through the full stack (panel → seatd → labwc → Wayland → Chromium → page):
  - Single tap: touchstart=1, touchend=1, click=1
  - Drag: 5 touchmoves delivered, down/up matched
  - Long press: down/up delivered correctly (no stray context menu — desired)
- Calibration: **not required** (absolute 1:1 native mapping). No permanent calibration changes made.

### Phase 9.4.6 — Failure testing

| Test | Result |
|---|---|
| Clean reboot | ✅ Boots straight to kiosk (verified twice) |
| Power-loss simulation (`sync && reboot -f`, hard reset) | ✅ Cold boot: dockerd restarted, all 8 containers healthy, backend 200, kiosk auto-started, SSH up, no fs repair needed |
| Docker/backend restart | ✅ `docker restart tars_backend` → healthy in ~20s, kiosk unaffected |
| Chromium crash (kill all) | ✅ Full service cycle (Stopping→Stopped→Started), TARS returned |
| Network unplug (wlan0 disconnect 20s) | ✅ Kiosk unaffected (localhost-only frontend, no CDN) |
| Network restored | ✅ NetworkManager auto-reconnected, same IP (10.0.0.231), SSH recovered |
| Browser restart | ✅ Covered by Chromium-crash test |

---

## Known Issues

1. **Benign Chromium dbus errors in logs** — `Failed to connect to the bus` (no session D-Bus in a kiosk). Harmless; no UI impact.
2. **No RTC on the Pi** — system clock is stepped by NTP after boot; container `StartedAt`/`uptime` can look briefly inconsistent right after cold boot. Cosmetic only.
3. **Physical power-cut not executed** — hard-reset (`reboot -f`) used as the closest safe remote equivalent; the cold-boot path is identical. An operator pull-the-plug test is the final confirmation if desired.
4. **Physical touch feel** — coordinate/orientation mapping verified at the hardware level; final subjective alignment (tap feel) should be confirmed by a human on the panel.

---

## Rollback Commands

```bash
# Stop and disable the kiosk, return to headless boot
sudo systemctl disable --now tars-kiosk.service
sudo systemctl set-default multi-user.target

# Remove created files
sudo rm -f /etc/systemd/system/tars-kiosk.service
sudo rm -f /etc/tmpfiles.d/tars-kiosk.conf
sudo rm -rf /etc/tars-kiosk

# Remove dedicated user and profile
sudo userdel kiosk
sudo rm -rf /var/lib/tars-kiosk

# Uninstall the graphical stack (removes packages pulled in by these too)
sudo apt-get remove --purge chromium labwc seatd

# Re-enable seatd if the kiosk is removed and seatd is no longer wanted
sudo systemctl disable --now seatd
```

Existing homelab services, Docker networking, and SSH are unaffected by any of the above.

---

## Artifacts

- `docs/tars-kiosk-render.png` — render capture from initial kiosk session
- `docs/tars-kiosk-render-final.png` — render capture after power-loss-simulation boot
