---
name: tars-frontend
description: TARS Three.js frontend, avatar system, animation pipeline, visual systems
when_to_use: "When working on the TARS visual frontend, avatar, animation, Three.js, or HTML/CSS"
allowed_tools: Read, Grep, Glob, Bash, Write, Edit
version: 1.0.0
requires_skills: [tars-world-engine]
references:
  - projects/tars-face/tars_face_v1.html
  - projects/tars-face/SUPER_PROMPT_AND_BASELINE.md
---

# TARS Frontend Skill

## Architecture

Single-file Three.js application (`tars_face_v1.html`) loaded via CDN. No build step, no bundler.

## Visual Systems

- **Procedural Entity** — Icosahedron body with vertex deformation, wireframe shell, inner glow core
- **Face System** — 2D canvas face with 14 emotion variations, pupil dilation/tracking, eyebrows, mouth, blush, forehead wrinkles, eyelids
- **Particle Systems** — Orbiting energy particles, FX burst system (celebration, warning, critical)
- **Dual Windows** — window_right (city view), window_left (bridge/river) with distinct exteriors, animated cars, parallax layers
- **Weather Visual Engine** — 10+ conditions with visual rendering
- **Dual Monitors** — Animated screens (terminal, TARS OS, matrix rain, starfield, syslogs)
- **LEDs and Fans** — Server LEDs, rack fans, PC RGB cycle
- **Birds** — Random bird flybys outside window

## Animation Loop Pipeline

Camera parallax → Day/night cycle → Weather sync → Autonomous needs → Decisions → World events → Monitor idle → LEDs/Fans → Animated screens → TARS position/movement → Face drawing → Body deformation → Particles → FX

## Key Files

- `tars_face_v1.html` — Complete single-file application
- `SUPER_PROMPT_AND_BASELINE.md` — Architecture specification

## Development

- No build step — edit HTML, refresh browser
- Run via local server: `python -m http.server 8080` in project directory
- Debug via browser DevTools console
