# Staging Intent Log (Pre-Execution Intent WAL)

> **Purpose:** Captures active architectural plans and major execution steps BEFORE they are executed.
> If a session is interrupted (rate limit / crash), the next session reads this file to resume in-flight work immediately.

---

## Active Staged Action

- **Timestamp:** 2026-08-04 UTC
- **Target Component:** TARS left-window view
- **Planned Action:** Remove the two legacy framed-art meshes that occupy the left-window opening. Preserve its frame, glass, rain, static environment image, and source-color rendering; defer monitor/game and collision/telemetry work.
- **Status:** Complete — committed as `d0edffa`, deployed to `tars.local`, and confirmed through a production Chromium reload with a visible 800x480 WebGL canvas, loaded window assets, and no startup exceptions.

---

## Phase 1 Objective

Build the foundation layer for the TARS World Engine. Establish a clean separation between:
- TARS LLM / Agent (queries World State)
- World State Interface (centralized authoritative state)
- Autonomy / World Simulation Layer (Environment, Weather, TARS State, Activity State, Preferences, Event Logging)
- Existing Three.js / Visual Frontend (Room, TARS, Windows, Weather Visuals, Animations, Objects)

The system should be designed so the visual world can eventually run autonomously without requiring constant LLM calls.

---

## Phase 1 Scope (Implementation Order)

1. **Generalized World State** - Centralized world-state representation
2. **Two Windows** - Add left-side window (`window_left`), keep existing as `window_right`
3. **Window Navigation** - TARS can navigate to either window, location tracked in state
4. **Window-Specific Activities & Events** - Distinct activities per window, events identify specific window
5. **Generalized TARS Preferences / Affinities** - Foundation for activities, locations, objects, environmental conditions, routines
6. **Generalized Weather System** - Weather as environment state, not just rain; extensible conditions
7. **Weather Visual Engine Foundation** - Refactor rain into generalized weather visual engine
8. **Weather Independence** - Weather exists independently of TARS
9. **Future Houston Weather API Compatibility** - Architecture ready for live data
9. **Current Visual Activity State** - Authoritative current activity state (location, activity, start time, reason, previous activity)
10. **Rolling Visual Activity Log** - Meaningful events only, rolling window
11. **Event Structure** - Structured events with timestamps, types, locations, metadata
12. **Existing Behavior Integration** - Connect existing movement/behavior to new state/event system
13. **Zero LLM Requirement** - Phase 1 works entirely locally
14. **Future Autonomy Compatibility** - Architecture ready for Phase 2 scheduler

---

## Architecture Being Introduced

### World State Structure
```js
worldState = {
    room: { currentRoom: "main_room", locations: { workstation, window_left, window_right, server_rack } },
    environment: { weather: { condition, intensity, precipitation, wind, lightning, visibility }, temperature, wind, visibility, timeOfDay },
    tars: { location, activity, activityStartedAt, mood, energy, preferences, previousActivity },
    activityLog: [ { id, timestamp, eventType, activity, location, reason, metadata }, ... ],
    preferences: { activities: {...}, locations: {...}, objects: {...}, conditions: {...}, routines: {...} }
}
```

### Dual Windows
- Existing window → `window_right` (position: WIN_X=2.5, WALL_Z=-6)
- New window → `window_left` (position: x≈-6.5, z=-6, same dimensions)
- Both navigable destinations with unique IDs
- Movement system supports both
- Activity system distinguishes them

### Generalized Weather State
```js
weather: {
    condition: "thunderstorm",      // clear, sunny, cloudy, overcast, rain, thunderstorm, snow, fog, etc.
    intensity: "heavy",             // light, moderate, heavy, severe
    precipitation: "rain",          // rain, snow, sleet, none
    wind: { intensity: "strong", direction: 270 },
    lightning: true,
    visibility: "reduced",          // clear, reduced, poor
    cloudCover: 0.9
}
```

### Preferences / Affinities (Generalized)
```js
preferences: {
    activities: { gaming: 0.8, computer_work: 0.7, server_check: 0.9, weather_observation: 0.6 },
    locations: { window_right: 0.9, window_left: 0.5, workstation: 0.8, server_rack: 0.85 },
    objects: { computer: 0.8, television: 0.6, radio: 0.7 },
    conditions: { thunderstorm: 0.8, rain: 0.6, clear: 0.4, night: 0.7 }
}
```

---

## Files / Components Expected to Change

| File | Changes |
|------|---------|
| `projects/tars-face/tars_face_v1.html` | All Phase 1 implementation |
| `memory/STAGING_INTENT.md` | This log (updated as work progresses) |

### Key Integration Points in `tars_face_v1.html`

1. **World State Module** - New centralized state object (after `currentState`)
2. **Window System** - Add `window_left` to `TARGET_POSITIONS`, create visual window on left wall
3. **Navigation** - Update `lookAt()` and collision to support both windows
3. **Weather Module** - New `environment` state + generalized weather visual engine
4. **Preferences Module** - New `preferences` state in `currentState` or `worldState`
5. **Activity State** - `currentActivity` with location, startedAt, reason, previousActivity
6. **Event System** - `activityLog` array + `logEvent()` function
7. **Visual Engine** - Refactor rain into `weatherVisualEngine` that reads `environment.weather`
7. **Preferences Module** - Generalized `preferences` object in `currentState` or `worldState`
8. **Activity Log** - `activityLog` array + `logActivityEvent()` function
9. **Integration** - Hook existing `lookAt()`, `triggerLocationBehavior()`, `setBehavior()` to update new state

---

## Validation Strategy

After each meaningful change:
1. **Syntax check** - No JS syntax errors
2. **Load test** - Page loads, Three.js initializes
3. **Console check** - No runtime errors in browser console
3. **Room renders** - Floor, walls, ceiling, windows visible
3. **TARS renders** - Core, body, face, particles, gaze indicator
3. **Existing windows** - Both windows visible, glass, frame, exterior
3. **TARS movement** - `lookAt('window_left')`, `lookAt('window_right')`, `lookAt('desk')`, `lookAt('user')` all work
3. **Collision avoidance** - Still steers around desk, racks, plants
3. **Desk/rack wiggle** - Still triggers on near-contact
3. **Location behaviors** - Both windows trigger distinct behaviors
3. **Weather** - Rain still works, weather state readable
3. **Preferences** - State accessible, no errors
3. **Activity log** - Events created on location arrival, readable
3. **Control panel** - All buttons still functional

---

## Rollback Considerations

- Single file (`tars_face_v1.html`) - git checkout restores previous version
- `STAGING_INTENT.md` documents intent for recovery
- Changes are additive (new state modules, new window) - minimal risk to existing systems
- If critical failure: `git checkout HEAD -- projects/tars-face/tars_face_v1.html`

---

## Current Implementation Status

- [x] World State module created
- [x] Dual windows (window_left added)
- [x] Window navigation & location tracking
- [x] Window-specific activities & events
- [x] Generalized preferences/affinities foundation
- [x] Generalized weather state model
- [x] Weather visual engine foundation (rain refactored)
- [x] Weather independence from TARS
- [x] Current Visual Activity State
- [x] Rolling Visual Activity Log
- [x] Event system with structured events
- [x] Existing behavior integration
- [x] Zero LLM verification (Phase 1)
- [x] Future autonomy compatibility (Phase 2 implemented)
- [x] Final validation pass
- [x] STAGING_INTENT.md finalized

## Phase 2 (Autonomous Scheduler / Needs System) — COMPLETE

- [x] 5 needs: energy, curiosity, social, maintenance, comfort
- [x] 6 autonomous activities with scoring (time/weather/preference/recency/distance)
- [x] Decisions every 2-5s, fx gate only blocks blocking fx
- [x] `setTARSActivity()` called in lookAt hook for activityStartedAt tracking
- [x] Need decay/restoration by location, time-of-day, weather
- [x] "Stay too long" penalty in scoring
- [x] Console logging of scores + needs every decision

## Phase 3 (In Progress) — LLM Intent → Behavioral JSON

### Audit Completed — 2026-07-27

**Verified:**
- Every supported mock intent produces valid JSON that passes schema validation
- Invalid emotions/gestures/targets are silently stripped by validate(); no crashes
- Intents route through World Engine: `TARS_INTENT.parse()` → `TARS.setBehavior()` → `lookAt()` → `setTARSActivity()` → `logActivityEvent()`, all updating `worldState`
- Intent updates: location, activity, activityReason, previousActivity, activityStartedAt, activityLog, worldState.tars.energy
- Autonomy and intents share the same `worldState`, activity state, event logging, and visual execution pipeline
- LLM prompt template now describes actual BEHAVIOR_PRESETS (14 emotions) and real capabilities
- Mock system is a replaceable dev layer — a real LLM would call `TARS.setBehavior()` directly with no changes to the World Engine
- 12 keyword rules cover all 7 representative intent flows (window left/right, game, work, rack, tv, alert)

**Bugs Fixed During Audit:**
1. Schema emotion enum listed 8 values; only 3 (`think`, `listen`, `chill`) existed in `BEHAVIOR_PRESETS`. `neutral`, `curious`, `happy`, `concerned`, `alert` were silent no-ops. Updated to all 14 actual presets.
2. Mock keyword rules used invalid emotions (`curious`, `happy`, `alert`, `concerned`) → mapped to valid equivalents (`think`, `amused`, `warning`, `confused`)
3. `currentState.energy` and `worldState.tars.energy` were independent copies. `setBehavior()` now syncs both.
4. `updateActivityDisplay()` was dead code — only called inside wrapper `lookAt()` whose condition always evaluated to false. Added periodic call to animate loop (every 1s).
5. Keyword "window" matched the chill rule (gaze: window_left) even for "right window" intents. Split into "right window" (rule 5) and "left window" (rule 6) for disambiguation.
6. Schema and LLM prompt documented "speak" capability that doesn't exist. Changed to "Future: speech bubble text (not yet implemented)".

**Architectural Weaknesses Discovered:**
1. **No priority/interruption system** — LLM intents immediately override autonomous behavior. The autonomous system tries to override back after 1-3s. No `controlMode` or priority field exists. Currently not a problem for demos, but needed before real LLM integration.
2. **Wrapper lookAt has dead code** — the wrapped lookAt's activity map (`observing_weather`, `interacting_with_user`) and extra event push are unreachable because the original lookAt already sets `worldState.tars.location`. No runtime impact but misleading.
3. **worldState.tars.energy vs worldState.tars.needs.energy** — same name, different semantics. `energy` is a 0-1 general state; `needs.energy` is a specific need for the autonomy system. Confusing but functionally separate.
4. **Activity reason always "autonomous_move"** — `lookAt()` hardcodes the reason, so LLM-driven moves don't show "llm_intent" in the log. Metadata-only issue.
5. **Mock intent "investigate an alert" has no gaze** — shows warning face but doesn't look toward any location. Acceptable for Phase 3 foundation.

**Architecture Readiness for Real LLM Integration:**
- Ready for controlled integration. The pipeline exists (`TARS.setBehavior()` → World Engine), schema is now accurate, and validate() catches invalid fields.
- **Required before production use:**
  1. Add `worldState.tars.controlMode` ("autonomous" | "llm") to prevent autonomy from overriding active LLM sessions
  2. Add explicit priority/interruption system
  3. Wire `reason` through `lookAt()` so LLM intents are distinguishable from autonomous moves in the activity log

### Objective
Create a structured pipeline that translates natural language intent (from an LLM or human) into TARS behavioral JSON consumed by `TARS.setBehavior()`.

### Architecture
```
LLM / Human Input
  → Intent Schema (structured JSON with emotion, energy, urgency, gaze, movement, gesture)
  → TARS Intent Parser (validate + map to internal actions)
  → TARS.setBehavior() (existing — executes gesture/emotion/movement)
  → World State update (log intent + behavior in activityLog)
```

### Components
1. **Intent Schema Definition** (`tools/tars_intent_schema.json`)
   - Define full JSON schema: `{ emotion, intensity, energy, urgency, gaze, movement, target, gesture }`
   - Enum values for emotion, gesture, gaze targets
   - Validation rules (e.g., energy 0-1, intensity 0-1)

2. **LLM Prompt Template** (`tools/tars_llm_prompt.md`)
   - System prompt instructing LLM to output structured behavioral JSON
   - Examples mapping natural language → valid JSON
   - Constraints (must use valid target keys, emotion values, etc.)

3. **Intent Parser** (inline in `tars_face_v1.html` or `tools/tars_intent_parser.py`)
   - Validate incoming JSON against schema
   - Map gaze/movement targets to `TARGET_POSITIONS` keys
   - Chain multiple behaviors (e.g., "look at window + gesture pulse + curious emotion")
   - Fall back to default behavior if parsing fails

4. **Mock Intent Generator** (for testing without LLM)
   - `window.TARS_INTENT.mock(input_string)` — keyword-based intent synthesis
   - Maps keywords: "storm" → curious+window, "work" → think+desk, "check" → listen+rack
   - Demo mode for Phase 3 testing without external LLM dependency

5. **Integration**
   - Hook parser output into existing `TARS.setBehavior()`
   - Log parsed intent in `worldState.activityLog`
   - Console debug output showing raw → parsed → executed chain

### Implementation Order
1. Define intent schema and validation
2. Build mock intent generator (keyword → JSON)
3. Build intent parser with schema validation
4. Create LLM prompt template
5. Integrate with world state logging
6. Test with mock generator, then real LLM

## Phase 3b (Complete) — Priority & Control Integration

### Implemented
- [x] `worldState.tars.controlMode` — centralized state with "autonomous" and "llm" values
- [x] `makeAutonomousDecision()` defers when `controlMode === "llm"` — needs continue, movement stops
- [x] `TARS.setBehavior()` sets controlMode to "llm" on intent, starts 60s auto-release timer
- [x] `TARS.releaseControl()` — explicit release back to autonomous
- [x] `window.TARS_CONTROL` — exposes `setMode()`, `getMode()`, `release()` for external control
- [x] `lookAt(targetKey, reason)` — reason parameter propagated through to `setTARSActivity()`
- [x] Activity reasons: `autonomous_move`, `llm_intent` (extensible: `environmental_event`, `scheduled_routine`, `user_interaction`, `system_alert`)
- [x] UI control panel buttons for AUTO / LLM / RELEASE
- [x] `getTARSActivitySummary()` includes `controlMode` in output
- [x] Emotion map fixed: `"curious"` → `"think"` for window_right (valid BEHAVIOR_PRESETS key)

### Architecture
```
LLM → TARS.setBehavior({gaze, emotion, ...})
       ├── sets worldState.tars.controlMode = "llm"
       ├── starts 60s auto-release timer
       ├── this.lookAt(target, "llm_intent")
       │     └── setTARSActivity(activity, location, "llm_intent")
       │           ├── updates worldState.tars.activity / location / reason
       │           └── logActivityEvent() → worldState.activityLog
       └── gesture / emotion → Three.js visual pipeline

Autonomy → makeAutonomousDecision()
            ├── if controlMode === "llm" → return (defer)
            ├── else → score locations → move → "autonomous_move"
            └── needs continue updating regardless
```

## Phase 3c (In Progress) — Stabilization Pass

**Objective:** Fix visual consistency, state machine edge cases, data alignment, and broken initialization without expanding scope.

**Timestamp:** 2026-07-27

### Bugs Fixed

1. **Bug 3 — Weather condition changes never propagate to visuals** (`updateFromWeatherState()` only called at init)
   - Added `weatherCheckAccum` timer in animate loop, calls `weatherVisualEngine.updateFromWeatherState()` every 2s
   - Ensures weather condition changes (e.g., clear → thunderstorm) reflect in rain particles, fog, lightning

2. **Bug 4+5 — window_left/window_right behaviors not differentiated** (both passed same key `"window"`)
   - Added `locationBehaviors["window_left"]` and `["window_right"]` aliases pointing to shared window behavior array
   - Proximity check now passes correct side key: `triggerLocationBehavior(atWindowLeft ? "window_left" : "window_right")`

3. **Bug 1 — worldState.locations.server_rack key mismatch** (key was `"server_rack"` but everything else uses `"rack-a"`)
   - Changed both `worldState.locations.server_rack` → `"rack-a"` and `prefs.locations.server_rack` → `"rack-a"`

4. **Bug 2 — Left window rain count was const** (couldn't be adjusted by weather engine)
   - Changed `const lrainCount` → `let lrainCount`, `const lrainSpeeds` → `let lrainSpeeds`
   - Added left rain handling to `applyEffects()`: reallocates/updates lrain positions + speeds when weather changes

5. **Bug 7 — Monitor idle screensaver stuck on codeReview/logCleanup states**
   - Added `'codeReview'` and `'logCleanup'` to `screensaverStates` array so they reset to `tarsOS` when returning to desk
   - Added both states to away-from-desk transition so they enter screensaver cycle instead of staying frozen

6. **Bug 15 — Dead code: `drawRackTransfer()`** (defined but never referenced)
   - Removed entire function (~20 lines)

### Remaining Known Issues (Not Addressed)

- `worldState.tars.energy` vs `worldState.tars.needs.energy` — duplicate semantic; confusing but functionally separate
- Wrapper `lookAt()` has dead activity map code — unreachable because original `lookAt()` already sets `worldState.tars.location`
- `deskWiggle` global initialized but shadowed by inner-scope `let deskWiggle` — harmless

## Phase 4 (Complete) — Cross-Session World Persistence

**Objective:** Give the TARS World Engine persistent state across browser sessions/restarts.

**Timestamp:** 2026-07-27

### Architecture

**Storage:** `localStorage` with key `tars_world_state_v1`, versioned schema (`TARS_SAVE_VERSION = 1`)

```
Save triggers:
  - setTARSActivity() — every meaningful activity change
  - beforeunload — tab/window close
  - setInterval every 30s — periodic checkpoint

Restore flow:
  beforeunload → WorldPersistence.load()
    ├── validate() checks version, required fields
    ├── applyToState() writes into worldState
    │     ├── tars: location, activity, reason, previousActivity, mood, energy, needs, preferences
    │     ├── environment: weather, timeOfDay, temperature
    │     └── worldMemory: curated persistent events
    └── fallback to defaults if missing/corrupt
```

### What is persisted

| Category | Fields | Storage |
|----------|--------|---------|
| **TARS State** | location, activity, activityStartedAt, activityEndsAt, activityReason, previousActivity, mood, energy, controlMode (always restored to "autonomous"), needs, preferences (full object), locationRecency | Snapshot |
| **Environment** | weather (condition, intensity, precipitation, wind, lightning, visibility), timeOfDay, temperature | Snapshot |
| **World Memory** | Curated array of meaningful events cross-session (~20 max) | Array |
| **Session** | previousSessionEnd, totalElapsed (ms since last save) | Computed at restore |

### What is intentionally NOT persisted

- `activityLog` (runtime noise, resets each session)
- `currentState` (Three.js animation state)
- `emotionMixer` state
- DOM / UI state
- Frame-level data
- `controlMode` (always restored to "autonomous")

### Session boundary handling

- `worldState.session.previousSessionEnd` set from `savedAt` timestamp on restore
- `worldState.session.totalElapsed` = `Date.now() - savedAt` (ms since last session)
- Session ID generated on each page load: `session_{timestamp}`
- No offline simulation yet — raw elapsed time is available for future use

### World Memory (curated persistent events)

- `worldState.worldMemory` — separate from runtime `activityLog`
- `logWorldEvent()` — logs to both `activityLog` (runtime) and `worldMemory` (persistent)
- `persistWorldEvent()` — core function for adding to worldMemory with size limit (20)
- Survives restarts — events from previous sessions are visible after reload

### Autonomy integration

- On startup, restored activity is set as current, with remaining duration preserved via persisted `activityEndsAt` (adjusted for real-time elapsed since save, or expired if the activity completed offline)
- Autonomy gates on `now < activityEndsAt` — does not override mid-activity
- Needs decay/restoration continues normally after restore
- Phase 3b priority gate (llm vs autonomous) preserved

### Validation tests executed

| Test | Result |
|------|--------|
| No saved data → defaults | PASS |
| Save and restore cycle | PASS |
| Corrupted JSON → fallback to defaults | PASS |
| Wrong version → fallback to defaults | PASS |
| Missing fields → fallback to defaults | PASS |
| Needs values preserved | PASS |
| worldMemory preserved across sessions | PASS |
| activityEndsAt persisted and restored with correct remaining duration | PASS |
| locationRecency timestamps shifted by offline elapsed time | PASS |
| Activity expired during offline → autonomy free on reload | PASS |

### Known limitations

- Single localStorage key — no migration path yet (version field is ready)
- Runtime `activityLog` resets each session (intentional — reduces noise)
- `beforeunload` save is best-effort (not guaranteed on crash/mobile kill)
- No backup or redundancy for localStorage data

## Phase 5 (Complete) — Internal State, Needs & Offline Continuity

**Objective:** Make TARS's persistent world state actually matter across time.

**Timestamp:** 2026-07-27

### Phase 5A: Internal Needs System

Added `hunger` need (0-1) to the existing needs array. Full need suite now:

| Need | Range | Decay (active) | Offline rate (/hr) | Satisfied by | High → |
|------|-------|----------------|-------------------|-------------|--------|
| energy | 0-1 | ~6%/min | +8% (recover) | desk, rack, user | seeks rest |
| curiosity | 0-1 | ~3.6%/min | +12% | windows (especially storms) | explores |
| social | 0-1 | ~4.8%/min | +15% | user interaction | seeks Amir |
| maintenance | 0-1 | ~2.4%/min | +6% | rack-a | checks servers |
| comfort | 0-1 | ~3.6%/min | +10% | windows (bridge view) | seeks cozy spot |
| hunger | 0-1 | ~1.8%/min | +20% | (future: food) | drawn to desk |

Needs influences are multiplicative with deficit — no hard thresholds.

### Phase 5B: Offline Elapsed-Time Processing

`processOfflineElapsed()` called after state restoration at startup:
- Computes elapsed hours from saved `previousSessionEnd`
- Applies compressed need changes using `OFFLINE_NEED_RATES_PER_HOUR`
- Caps offline simulation at 168 hours (1 week)
- Energy recovers offline (resting), all other needs increase
- Records `_offlineEvent` with previous/resulting needs
- Offline event persisted to `worldMemory`

### Phase 5C: Session Return Context

`getSessionReturnContext()` returns structured snapshot:
- awayDurationMs, awayDurationLabel, absenceCategory
- absence categories: first_session, brief, moderate, extended, long_absence
- Current needs, previous activity, location, environment
- Offline event details

### Phase 5D: Activity Scoring

- Hunger pressure added to `scoreLocation()`:
  - hunger > 0.5: desk gets +(hunger-0.5)*40 bonus
  - hunger > 0.8: +20 urgency bonus (any location change better)
- Scoring continues to use need deficit × restoration × 100 as primary driver
- All existing factors preserved: preference, weather, routine, recency, distance, randomness

### Phase 5E: Priority/Interruption Structure

`PRIORITY` enum: LOW(1), MEDIUM(2), HIGH(3), CRITICAL(4)
Used in `ACTIVITY_REGISTRY` to classify each activity's interruption tolerance.
Phase 3b `controlMode` preserved unchanged — autonomy defers when "llm".

### Phase 5F: Future-Ready Activity Context

`ACTIVITY_REGISTRY` — lightweight metadata per activity:
- id, label, location, needsSatisfied, priority, interruptionOkay, resumable, persistentEvent
- Covers: weather_observation, computer_work, server_check, user_interaction, idle
- Extensible — new activities register by adding entry

### Phase 5G: Persistence Integration

- `hunger` automatically persists via spread needs in WorldPersistence.capture()
- Offline events stored in worldMemory via persistWorldEvent()
- All existing validation, save triggers, and restore flow unchanged

### Phase 5H: LLM-Ready Context API

`getTARSContext()` returns compact agent-readable snapshot:
- currentState (location, activity, mood, energy, controlMode)
- internalNeeds (all 6 needs with values)
- currentActivity (id, location, duration, reason)
- recentEvents (last 10 activity log entries)
- environment (weather, timeOfDay, temperature)
- sessionReturn (awayDuration, absenceCategory, offlineNeedsChange)
- preferences
- controlMode

Exposed as `window.getTARSContext`.

### Tests performed

| Test | Result |
|------|--------|
| No elapsed time → skip offline processing | PASS |
| 10h offline → needs change correctly | PASS |
| 1-week cap prevents absurd values | PASS |
| Session return context categories (extended) | PASS |
| Context API shape (has all required fields) | PASS |
| hunger in needs output | PASS |
| All needs stay in [0,1] range | PASS |

### Known limitations

- No active hunger restoration yet (no food activity available)
- Offline rates are linear per hour — no time-of-day variation yet

## Phase 6 (Complete) — LLM ↔ World Engine Integration

**Objective:** Build the integration boundary that allows an LLM to observe and participate in the World Engine without creating a second behavior system.

**Timestamp:** 2026-07-27

### What was built

| System | Description |
|--------|-------------|
| **getTARSContext() enhanced** | Now includes `availableActions` (emotions, gestures, gaze targets, movements, activities), `locations` with coordinates, `isNight` |
| **validateIntent()** | Public validation returning `{ valid, errors[], sanitized }` — safe for LLM intents, no mutation |
| **TARS_INTENT.sanitize()** | Silently strips invalid fields from raw object input (replaces old `validate()` as the inner pipeline) |
| **TARS_INTENT.parse() fixed** | Now returns `{ behavior, validation }` object instead of raw behavior; missing `.shift()` for log pruning fixed; `validateIntent` exposed publicly |
| **TARS_LLM** | Clean entry point: `handleIntent(intent)` → validates → routes through existing `TARS.setBehavior()` pipeline; `endConversation()` → releases control; `getContext()` → structured snapshot; `isAvailable()` → checks controlMode |
| **queueWorldEvent()** | External event queue with priority; events drain silently if below current activity priority |
| **processWorldEvents()** | Called each frame in animate loop; compares event priority vs current activity priority; interrupts only if event > current; defers entirely when controlMode === "llm" |
| **ACTIVITY_REGISTRY expanded** | Added `gaming`, `tv_watching` entries; all 6 activities now have `requiredObject` field; `needsSatisfied` expanded; `user_interaction` marked `persistentEvent: true` |
| **Wrapper lookAt fixed** | Now accepts and passes `reason` parameter through to `setTARSActivity()` instead of hardcoding `"autonomous_move"`; uses `.call()` instead of `.apply()` for cleaner signature |

### Key design properties

- **LLM is the intelligence layer, not the World Engine** — the World Engine remains authoritative over simulated world, internal state, available actions, and visual state
- **All LLM actions flow through existing pipeline**: `handleIntent()` → `TARS_INTENT.parse()` → `TARS.setBehavior()` → `lookAt()` → `setTARSActivity()` → `WorldPersistence.save()`
- **Autonomous behavior preserved when not interacting**: controlMode remains "autonomous" by default; LLM only takes control via `TARS.setBehavior()`
- **World systems continue during conversation**: `updateNeeds()`, weather, time, persistence all run normally
- **Invalid intents cannot crash the engine**: `validateIntent()` returns detailed errors; empty intents produce no action
- **Interruptions respect priority**: HIGH-priority world events interrupt MEDIUM activities; LOW events drain silently during MEDIUM+ activities; all events deferred during LLM conversations

### Validation tests executed

| Test | Result |
|------|--------|
| Valid LLM intent (emotion+gaze+gesture+energy) → accepted | PASS |
| Invalid emotion → rejected with error | PASS |
| Invalid gaze target → rejected with error | PASS |
| Null intent → rejected with error | PASS |
| Energy clamped to [0,1] | PASS |
| Priority ordering (HIGH > MEDIUM > LOW) | PASS |
| Interruption only when event > current activity priority | PASS |
| JavaScript syntax validation | PASS |
| No duplicate declarations or undefined references | PASS |

### Known limitations

- No real external LLM connected yet (Phase 6 is the integration boundary, not the LLM itself)
- `emitWorldEvent()` doesn't have autonomous environmental triggers yet (Phase 7)
- No chat UI (Phase 7)
- Interruption system uses a simple array queue — no dedup or cooldown yet

## Phase 6 Final Fix (Complete) — Mid-Activity State Persistence

**Objective:** Ensure `activityEndsAt` and `locationRecency` survive browser reloads so that restored sessions preserve remaining activity duration and location-cooldown state.

**Timestamp:** 2026-07-27

**What changed:**

| Change | File | Description |
|--------|------|-------------|
| `activityEndsAt` in capture() | `WorldPersistence.capture()` | Field added to snapshot |
| `activityEndsAt` in applyToState() | `WorldPersistence.applyToState()` | Restored using `Math.max(saved, Date.now())` so real-time elapsed is accounted for; expired activities immediately free autonomy |
| `locationRecency` in capture() | `WorldPersistence.capture()` | Shallow copy of map added to snapshot |
| `locationRecency` in applyToState() | `WorldPersistence.applyToState()` | Timestamps shifted forward by `Date.now() - savedAt` so recency penalties are preserved across sessions |

**Behavior after restore:**
- Activity resumes with correct remaining real-time duration (or expires immediately if the end time has passed)
- Autonomy gates on `now < activityEndsAt` — no premature override
- Location cooldowns preserved — TARS remembers which locations were recently visited

## Phase 7 (Planned) — Environmental Events, Ambient Life & Chat UI
