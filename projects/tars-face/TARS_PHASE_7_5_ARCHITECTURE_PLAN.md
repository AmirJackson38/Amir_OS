> **⚠️ HISTORICAL DOCUMENT**
> This document describes the Phase 7.5 plan before P1 was completed. Phase 7.5 P1 (score breakdown, runner-up display, decision timeline) has been implemented and committed. P2 (activity statistics, fatigue history, experience viewer) has not been started. Current implementation is documented in `docs/CURRENT_STATE.md` and `docs/ARCHITECTURE.md`.

# Phase 7.5 — Observatory Intelligence Architecture Plan

## Current State (Post-Phase 7.4 Cleanup)

### World State Schema

```
worldState
├── tars
│   ├── location              : string          — current location key
│   ├── controlMode           : "autonomous"|"llm"
│   ├── activity              : string          — current activity id
│   ├── activityStartedAt     : timestamp
│   ├── activityEndsAt        : timestamp
│   ├── activityReason        : string
│   ├── previousActivity      : { activity, location, duration, endedAt } | null
│   ├── locationRecency       : { locationKey → lastLeftTimestamp }
│   ├── activityRecency       : { activityKey → lastEngagedTimestamp }
│   ├── activityFatigue       : { activityKey → 0..1 }
│   ├── continuationCount     : number
│   ├── currentIntent         : { intent, activity, location } | null
│   ├── experienceBuffer      : [{ activity, location, duration, startedAt, endedAt, fatigueAtEnd, needsSnapshot }] — max 100
│   ├── lastWanderTime        : timestamp
│   ├── autonomy              : { timestamp, intent, selectedActivity, selectedLocation, decisionAction, decisionReason, decisionScore, needs, ...extra } — last decision
│   ├── autonomyHistory       : [decision objects] — max 200
│   ├── mood                  : string
│   ├── energy                : 0..1
│   ├── needs                 : { energy, curiosity, social, maintenance, comfort, hunger } — each 0..1
│   └── preferences           : { activities, locations, objects, conditions, routines }
├── activityLog               : [{ id, timestamp, eventType, activity, location, reason, metadata }] — max 50
├── worldMemory               : [] — max 20
├── environment               : { weather, temperature, timeOfDay }
└── session                   : { id, startTime, lastActivityTime, ... }
```

### Decision Object (on each autonomyHistory entry)

```
{
    timestamp,           // Date.now()
    intent,              // "work"|"maintain"|"observe"|"socialize"|"entertain"|"rest"
    selectedActivity,    // activity id
    selectedLocation,    // location key
    decisionAction,      // "start"|"continue"|"complete"|"switch_activity"|"move"|"stay"|"wander"|"idle"
    decisionReason,      // human-readable string from generateDecisionReason()
    decisionScore,       // final score of selected activity (number, no component breakdown)
    needs,               // snapshot of all needs at decision time
    ...extra             // optional: fatigueAtDecision, continuationCount, wanderTarget, triggerReason
}
```

### Experience Entry (on experienceBuffer)

```
{
    activity,            // activity id
    location,            // location key
    duration,            // ms
    startedAt,           // timestamp
    endedAt,             // timestamp
    fatigueAtEnd,        // 0..1
    needsSnapshot        // { energy, curiosity, social, maintenance, comfort, hunger }
}
```

### Scoring Engine Output

- `selectBestActivity()` returns `{ activity: id, scores: [{ id, score }] }` — only total scores
- `scoreLocation(location)` returns a raw number — no component breakdown returned
- Score components exist internally but are NOT recorded: need deficit, preference, fatigue penalty, curiosity exploration, recency penalty, idle baseline, weather bonus
- **No score breakdown is persisted** — this is the primary gap

### Current Observatory UI Tabs

| Tab | What It Shows | Data Source | Live? |
|-----|---------------|-------------|-------|
| Brain | Current activity, location, intent, reason, mode, action, score, next eval, fatigue, continuations | `worldState.tars.*` | 800ms throttle |
| Observatory | Need bars, activity score totals, fatigue map, recent 5 decisions as text | `worldState.tars.needs`, `TARS_AUTONOMY.getActivityScores()`, `worldState.tars.activityFatigue`, `worldState.tars.autonomyHistory.slice(-5)` | 800ms throttle |
| Journal | Activity timeline from activityLog (50 entries) with autonomyHistory fallback | `worldState.activityLog` / `worldState.tars.autonomyHistory` | 800ms throttle |
| Settings | 7 collapsible sections (System Controls, Behavior/Gesture/Activity/Location Testing, Need Simulation, Diagnostics) | `worldState.tars.*`, `ACTIVITY_REGISTRY`, `WorldPersistence` | Partial live refresh |
| Chat | Placeholder message UI | `TARS_CHAT` (independent) | Manual send |

## Problem Statement

The creator currently sees *what* TARS is doing but cannot easily answer:

1. **Why did this score win?** — `selectBestActivity()` computes need deficit, preference, fatigue, curiosity, recency, and weather components, but only the final score is recorded. No breakdown exists in telemetry.
2. **What was the runner-up?** — The opposing candidate and its scores are not stored.
3. **What patterns are emerging?** — Experience buffer has rich data (durations, fatigue, needs at completion) but no aggregated statistics viewer.
4. **How is fatigue trending?** — Only current fatigue is visible. No history or decay visualization.
5. **What are TARS's behavioral tendencies?** — No statistics on most frequent activities, average durations, preferred locations over time.
6. **Where does time go?** — No activity heatmap or time-in-activity breakdown.

## Proposed Features — Ranked

### Priority 1: Must-Have (Core Observability)

These fix the fundamental "why" gap. Without these, no higher insight is meaningful.

**1a. Score Breakdown Recording**
- Add component scores to each `autonomyHistory` entry: `{ needScore, preferenceScore, fatiguePenalty, curiosityScore, recencyPenalty, idleBaseline, weatherBonus, totalScore }`
- Display breakdown in a new "Score Breakdown" expandable section in the Observatory tab
- Files affected: `selectBestActivity()`, `recordAutonomyDecision()`, `renderObservatory()`
- Complexity: Low (~15 lines added to scoring, ~30 lines to UI)
- Risk: Very low — additive change, no behavioral impact

**1b. Runner-Up Display**
- Store the second-place candidate in each `autonomyHistory` entry
- Show "Activity: X (score: Y) | Runner-up: Z (score: W)" in Brain tab
- Files affected: `makeAutonomousDecision()`, `recordAutonomyDecision()`, `renderBrain()`
- Complexity: Low (~10 lines)

**1c. Decision Timeline (Text-Based)**
- Replace the "Recent Decisions" text list in Observatory with a compact scrollable timeline
- Each entry shows: action icon + activity + location + top need deficit driving it + score
- Click to expand full score breakdown
- Files affected: `renderObservatory()`
- Complexity: Low (~20 lines CSS + ~15 lines JS)

### Priority 2: Useful (Pattern Intelligence)

These aggregate existing data into insight.

**2a. Activity Statistics**
- New tab or section: "Behavior Statistics"
- Metrics computed from autonomyHistory and experienceBuffer: most frequent activities (top 3), average duration per activity, average fatigue at completion, most common decision action type, preferred locations
- All data sources exist — no new state needed
- Files affected: New `renderStats()` function, add to TARS_UI tab switch
- Complexity: Medium (~60 lines)

**2b. Fatigue History Chart**
- Record fatigue snapshot at each decision (already partially available via `fatigueAtDecision` in extra field)
- Display a simple text/badge timeline of fatigue changes
- Files affected: `renderObservatory()` — expand the fatigue section
- Complexity: Low (~15 lines)

**2c. Experience Buffer Viewer**
- Replace the one-liner in Diagnostics with a paginated/scrollable list of experience entries
- Show: activity + location + duration (formatted) + fatigue at end + what needs were low
- Files affected: `renderSettings()` diagnostics section
- Complexity: Low (~20 lines)

### Priority 3: Future (Nice-to-Have)

These require significantly more UI work.

**3a. Location Heatmap**
- Color-code locations in the 3D scene based on time spent or visit frequency
- Requires: tracking cumulative time per location (new state)
- Risk: Duplicates state (could compute from autonomyHistory but that's O(n) each render)
- Defer unless visual evidence is critical

**3b. Personality/Trend Observation**
- Analyze preferences + activity history to produce statements like "TARS prefers server_check in the morning"
- Requires: cross-referencing activity patterns with time-of-day, weather, recency
- Complexity: High — requires statistical analysis and natural language generation
- Defer to Phase 8 (LLM can do this from context snapshot)

**3c. "Why This Decision?" Trace View**
- Click a timeline entry to see a full visualization: need deficits → score component bars → location scores → final choice
- Complexity: Medium-High (~80 lines of UI)
- Only valuable if score breakdown data exists (P1a prerequisite)

## Data Flow

```
worldState (source of truth)
    │
    ├── selectBestActivity()          ──→ scores array (total only)
    │        ↓                              ↓
    │   makeAutonomousDecision()       recordAutonomyDecision()
    │        ↓                              ↓
    │   worldState.tars.autonomy      autonomyHistory[] (max 200)
    │   worldState.tars.activity              + needs snapshot
    │   worldState.tars.location              + extra fields
    │
    ├── experienceBuffer[]            ←── finalizeExperience()
    │                                        on activity complete
    │
    ├── activityLog[]                 ←── logActivityEvent() / logStateChange()
    │                                        behavioral changes
    │
    └── → TARS_AUTONOMY.getActivityScores()  → renders Observatory tab
        → worldState.tars.*                  → renders Brain tab
        → autonomyHistory[]                  → renders Journal + timeline
        → experienceBuffer[]                 → renders Memory Inspector
```

**Phase 7.5 Change:** Score breakdown will flow through `recordAutonomyDecision()` and be stored in each history entry, then rendered in the Observatory.

```
selectBestActivity() ──→ returns { activity, scores: [{id, score, components}] }
    ↓
makeAutonomousDecision() ──→ picks winner + runner-up
    ↓
recordAutonomyDecision()  ──→ stores with full breakdown + runner-up
    ↓
autonomyHistory[]  ──→ renderObservatory() shows breakdown
```

## Required Code Changes

### File: `tars_face_v1.html`

| Change | Function/Location | Lines | Effort |
|--------|------------------|-------|--------|
| Score breakdown recording | `selectBestActivity()` | +15 | Low |
| Pass breakdown to `recordAutonomyDecision()` | call sites in `makeAutonomousDecision()` | +5 | Low |
| Store score components in decision object | `recordAutonomyDecision()` | +3 | Low |
| Store runner-up in decision object | `makeAutonomousDecision()` | +4 | Low |
| Score breakdown display in Observatory | `renderObservatory()` | +30 | Low |
| Runner-up in Brain display | `renderBrain()` | +3 | Low |
| Decision timeline (clickable, compact) | `renderObservatory()` | +20 | Low |
| Activity statistics (new section or tab) | New `renderStats()` function | +60 | Medium |
| Fatigue history aggregation | `renderObservatory()` fatigue section | +15 | Low |
| Experience buffer viewer (paginated) | `renderSettings()` diagnostics section | +25 | Low |
| Activity heatmap in 3D scene | `animate()` + new state | +40 | High (new state) |

**Total estimate: ~180 lines, 0 new state variables (except heatmap), 0 API changes.**

### Functions NOT Touched
- `scoreLocation()` — unchanged (still returns raw score; breakdown is only in `selectBestActivity`)
- `finalizeExperience()` — unchanged
- `updateNeeds()` — unchanged
- `selectBestLocation()` — unchanged
- `TARS_CONTROL` — unchanged
- `TARS_AUTONOMY` API surface — unchanged (but implementation of `getActivityScores()` will include component data)
- `WorldPersistence` — unchanged
- Three.js rendering — unchanged except optional heatmap overlay

## Risks

### 1. Duplicate State Risk (Low)
Score breakdown is computed from existing data (needs, preferences, fatigue, recency). Storing it is a cache, not new state. The `needs` field is already snapshotted per decision. Adding score components is similarly additive.

**Mitigation:** Only store breakdown at decision time. Do not create a separate scores array in worldState.

### 2. Performance Risk (Low)
- `autonomyHistory` is already bounded at 200 entries — adding ~10 numeric fields per entry adds ~8KB max
- `experienceBuffer` bounded at 100 entries — no new fields needed
- UI refresh is already throttled at 800ms
- Activity statistics computation (Priority 2a) requires iterating autonomyHistory each render — O(n) on 200 entries is negligible

### 3. UI Clutter Risk (Medium)
The Observatory tab already has 4 sections (Needs, Scores, Fatigue, Decisions). Adding score breakdowns, duration data, and a clickable timeline could make it overwhelming.

**Mitigation:** Use collapsible sections (same pattern as Creator Console). Default: Needs + Scores (expanded), Fatigue + Timeline + Breakdown (collapsed). Keep the tab as a dense developer tool, not a marketing dashboard.

### 4. Future LLM Integration Conflict (Low)
Storing score breakdown does not conflict with the cognitive layer boundary. The LLM receives a compressed context via `getTARSContext()` — this does not include per-decision breakdowns. The breakdown is a developer-side feature only.

If the LLM eventually needs score data, it can request it via the TARS_CHAT API boundary.

### 5. Score Breakdown Accuracy (Low)
Score components must sum to the total score (or at least be proportional). Currently:
- `score = needScore + preferenceScore - fatiguePenalty + curiosityScore - recencyPenalty + idleBaseline + weatherBonus + noise`
- The noise term (±3 for location, embedded in activity scoring logic) is not separately tracked but is small
- Mitigation: make noise explicit in the breakdown calculation

## Check: Is TARS Ready for Amir_OS Brain Connection?

**Answer: Almost, but not yet.**

### What's Ready
- `getTARSContext()` returns a complete compressed world snapshot
- `TARS.setBehavior()` accepts structured intent JSON from LLM
- TARS_CHAT boundary exists (send/receive placeholder)
- World persistence survives reload
- Autonomous fallback works when LLM is offline

### What's Missing
- **Score explanations**: The LLM needs to understand WHY TARS chose an activity to suggest meaningful alternatives. Currently `getTARSContext()` doesn't include recent decision history with score breakdown.
- **Experience summary**: The LLM needs a digest of recent experiences to make context-aware suggestions. Currently `getTARSContext()` only shows the current activity, not the experience buffer.
- **Action format stability**: The `decisionAction` values ("start","continue","complete","switch_activity","move","stay","wander","idle") are not yet standardized as a formal protocol.

### Recommended Order

1. **Phase 7.5 Priority 1 (Must-Have)** — Score breakdown + runner-up + timeline
   - This gives the creator (and future LLM) the "why" data
   - ~55 lines, zero risk
2. **Phase 7.5 Priority 2 (Useful)** — Activity stats + fatigue history + experience viewer
   - This gives pattern insight
   - ~100 lines, zero new state
3. **Augment `getTARSContext()`** — Add recent decision summary and experience digest
   - Prepares the LLM boundary for Phase 8
   - ~15 lines
4. **Phase 8 (Cognitive Layer)** — LLM connection via TARS_CHAT
   - Once observability exists and context includes reasons, Phase 8 is safe to begin

### Before Phase 7.5 Begins

- [x] Phase 7.4 cleanup complete (commit f7ca8d8)
- [x] Old duplicate UI removed
- [x] All data sources verified live
- [x] No stale or duplicate state
- [x] Three.js/autonomy/persistence untouched

### Blockers

None. Phase 7.5 Priority 1 can begin immediately. The score breakdown data does not change behavior — it adds telemetry fields to existing decision objects.

## Summary

| Item | Verdict |
|------|---------|
| Phase 7.5 worth doing? | Yes — the "why" gap is real |
| Any fixes needed first? | No |
| Current telemetry sufficient? | No — score breakdown is missing |
| Data sources sufficient? | Yes — all components exist in memory, just not recorded |
| New state needed? | None (Priority 1+2) |
| Blur architecture boundaries? | No |
| Ready for Amir_OS brain? | After Phase 7.5 P1 + context augmentation |
