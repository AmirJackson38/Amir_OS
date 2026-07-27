# Staging Intent Log (Pre-Execution Intent WAL)

> **Purpose:** Captures active architectural plans and major execution steps BEFORE they are executed.
> If a session is interrupted (rate limit / crash), the next session reads this file to resume in-flight work immediately.

---

## Active Staged Action

- **Timestamp:** 2026-07-27 12:00:00 UTC
- **Target Component:** T.A.R.S. Embodiment System v1.1 — Polish & Collision
- **Planned Action:** 
  1. Fix location behavior triggers (server/window not firing)
  2. Add 5 distinct behaviors per station (currently 3)
  3. Window station: birds, wind gust, window open/close, stargazing, weather reaction
  4. Desk: more monitor modes (dual-monitor span, screensavers, code/matrix/logs)
  5. Collision system: obstacle avoidance (A* or steering), desk/rack as solid bodies, table wiggle on impact, pathfinding around obstacles
- **Status:** In-Progress

---

## Summary of Completed Work (v1.0)

**File:** `projects/tars-face/tars_face_v1.html`

### Core Entity
- Procedural T.A.R.S. entity: energy core, deforming body (icosahedron L3), wireframe shell, orbiting particle field (30 particles)
- **Expressive Face System** (256x256 canvas): animated eyes with pupils/highlights/blinks/squint/look-tracking, dynamic eyebrows per emotion, expressive mouth (speaking sync, smiles, grimaces, smirks, wavy), cheek blush, forehead wrinkles

### Behavior Engine
- **14 Behavior Presets**: idle, listen, think, speak, sarcastic, amused, confused, serious, warning, critical, celebrate, chill, disapproving, excited
- **EmotionMixer**: Smooth lerp transitions with intensity scaling
- **FX System**: Distinct animations per state (strobe_orange, strobe_red, expansive burst+rainbow, strobe, bounce, scan, wobble, flicker, steady, slow_pulse)
- **Speech Reactivity**: `onSpeechStart/End`, `setSpeechAmplitude/Pitch` drives mouth + core pulse + deformation

### Movement & Interaction
- **Gaze → Movement**: Click gaze buttons → TARS physically flies to location (smooth spring)
- **Location Behaviors** (3 random per station):
  - **Desk**: BIOS boot→TARS OS | Linux hacking overlay | Neural calibration
  - **Rack**: Data transfer (orange sparks + strobe) | Diagnostic scroll | Firmware update (blue→green)
  - **Window**: Chill morph | Amused shape-shift | Blinds pulse
  - **User**: Close inspect (flies to camera, scale 1.4, dilated pupils) | Face tracking | Playful nod+shake+pulse
- **Spark Particles**: Physics-based (gravity, fade, color decay) from rack

### API
- `window.TARS.setBehavior({emotion, intensity, energy, urgency, gaze, movement, target, gesture})` - LLM intent JSON
- `window.TARS.lookAt(target)` / `moveTo(pos)` / `triggerGesture(name)` / speech hooks
- Console logging for all actions

### Performance
- Reduced: shadow map 512px, pixelRatio 1.0, body detail 3, shell detail 1, particles 30/60/100/120
