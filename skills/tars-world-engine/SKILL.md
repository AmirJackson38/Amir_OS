---
name: tars-world-engine
description: TARS autonomous needs system, decision engine, scoring, weather, persistence, LLM integration
when_to_use: "When working on TARS autonomous behavior, needs system, decision engine, scoring, world events, weather, or persistence"
allowed_tools: Read, Grep, Glob, Bash, Write, Edit
version: 1.0.0
requires_skills: []
references:
  - projects/tars-face/tars_face_v1.html
  - projects/tars-face/SUPER_PROMPT_AND_BASELINE.md
---

# TARS World Engine Skill

## Core Architecture

```
LLM / External Agent
  └─→ TARS_LLM.handleIntent(intent)
       └─→ TARS_INTENT.parse() → TARS.setBehavior()
            └─→ lookAt() → setTARSActivity()
                 └─→ WorldPersistence.save()

Autonomous Engine
  └─→ makeAutonomousDecision() (every 2-4s)
       ├── selectBestActivity() (need-based)
       ├── selectBestLocation() (preference + recency)
       └── TARS.lookAt(location, activity)
```

## Needs System (6 needs, 0-1)

- energy, curiosity, social, maintenance, comfort, hunger
- Decay rates: 1.8-6%/min based on need
- Location restoration: different locations restore different needs
- Activity effects: continuous need changes + completion bonuses
- Environmental modifiers: night, storm, rain

## Scoring Engine

- Need deficit × restoration amount
- Preferences (activities, locations, conditions, routines)
- Recency penalty (45s location cooldown, 120s activity cooldown)
- Distance penalty
- Weather affinity (need-weighted)
- Random jitter (±7.5) for organic behavior

## Activity Registry (7 activities)

- computer_work, server_check, weather_observation, user_interaction, gaming, tv_watching, idle
- Each has: location, needsSatisfied, priority, min/max duration

## Decision Flow (Phase 7.2)

1. Intent: selectBestActivity() scores all 7 by need deficits
2. Location: selectBestLocation() scores compatible locations
3. Stay/move: three-tier inertia check
4. Execute: lookAt() with overrideActivity

## Persistence

- localStorage (tars_world_state_v1)
- Versioned schema, save on activity change + 30s interval + beforeunload
- ActivityEndsAt and locationRecency persisted across reloads
- activityRecency persisted with offline time-shifting

## Telemetry (Phase 7.2A)

- autonomy object: intent, selectedActivity, selectedLocation, decisionAction, decisionReason, decisionScore, needs snapshot
- autonomyHistory: bounded at 200 decisions
- Exposed via window.TARS_AUTONOMY
