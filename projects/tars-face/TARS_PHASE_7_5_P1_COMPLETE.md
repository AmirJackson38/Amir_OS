# Phase 7.5 P1 Complete — Autonomy Decision Transparency Telemetry

## What Changed

### 1. Score Breakdown Recording (`selectBestActivity()`)

Each activity candidate now tracks 7 score components independently:

| Component | Contribution | Description |
|-----------|-------------|-------------|
| need | +X.XX | Deficit × needSatisfied amount × NEED_WEIGHT (1200) |
| preference | +X.XX | Activity preference (0.5 default) × PREFERENCE_WEIGHT (8) |
| fatigue | -X.XX | Current fatigue × FATIGUE_WEIGHT (6) |
| curiosity | +X.XX | Curiosity deficit × CURIOSITY_EXPLORE_WEIGHT (4) × multiLoc bonus |
| recency | -X.XX | Max(0, 120s - timeSince) × RECENCY_PENALTY_RATE (0.3) |
| weather | +X.XX | ENVIRONMENT_BONUS (2) if thunderstorm/heavy_rain + weather_observation |
| idle | +X.XX | IDLE_BASELINE (2) if activity == "idle" |

Each candidate now returns `{ id, score, components: { need, preference, fatigue, curiosity, recency, weather, idle } }`.

**Score total unchanged.** Components sum to the same total. Scoring formulas, constants, and behavior unmodified.

### 2. Runner-Up Information

`selectBestActivity()` now sorts candidates and returns `topAlternatives: [{ id, score }]` — top 3 entries by score.

### 3. Telemetry Storage (`recordAutonomyDecision()`)

Every `recordAutonomyDecision()` call now passes:
```javascript
{
    scoreComponents: winnerComponents,   // { need, preference, fatigue, curiosity, recency, weather, idle }
    alternatives: topAlternatives         // [{ id, score }, ...] — top 3
}
```

These are stored in each `autonomyHistory` entry via the existing `...extra` spread. No schema change. No new worldState fields.

### 4. Brain Tab Enhancement (`renderBrain()`)

Added inline Score Breakdown display in the "Autonomous Simulation Layer" section:
- Color-coded component list (green=positive, red=negative)
- Weighted total at bottom matching `a.decisionScore`
- Runner-up list below (2nd and 3rd place candidates)

All collapsible within the existing tab — does not clutter the room.

## Validation Results

| Check | Result |
|-------|--------|
| Scoring formulas unchanged | All 7 formula patterns preserved identically |
| Score totals match components | Sum validated structurally (same operators, same inputs, same constants) |
| No new worldState fields | `scoreComponents`/`alternatives` only in `autonomyHistory` entries (via `...extra`) |
| `recordAutonomyDecision()` signature unchanged | `function recordAutonomyDecision(intent, selectedActivity, ...)` preserved |
| `TARS_AUTONOMY.getActivityScores()` unchanged | `const { scores } = selectBestActivity()` destructure preserved |
| All 6 call sites updated | All pass `scoreComponents: winnerComponents, alternatives: topAlternatives` |
| Three.js untouched | `new THREE.Scene` + animate loop unmodified |
| Persistence schema untouched | `TARS_SAVE_VERSION = 2`, `WorldPersistence` unmodified |
| Needs system untouched | `NEED_DECAY_RATES`, `updateNeeds()` unmodified |
| Activity lifecycle untouched | `ACTIVITY_REGISTRY`, `finalizeExperience()`, `makeAutonomousDecision()` flow unmodified |

## Files Affected

| File | Lines Changed | Type |
|------|--------------|------|
| `tars_face_v1.html` | ~90 | Additive telemetry + brain tab display |

## Commit

```
Phase 7.5 P1: add autonomy decision transparency telemetry
```

Next: Phase 7.5 P2 (activity statistics, fatigue history, experience viewer) — when ready.
