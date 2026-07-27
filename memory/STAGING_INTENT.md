# Staging Intent Log (Pre-Execution Intent WAL)

> **Purpose:** Captures active architectural plans and major execution steps BEFORE they are executed.
> If a session is interrupted (rate limit / crash), the next session reads this file to resume in-flight work immediately.

---

## Active Staged Action

- **Timestamp:** 2026-07-27 20:30:00 UTC
- **Target Component:** T.A.R.S. World Engine — Phase 3: LLM Intent Parsing & Behavioral JSON
- **Planned Action:** Phase 3 Implementation — Intent schema + mock generator + LLM prompt template built. Needs integration testing and real LLM hookup.
- **Status:** In Progress (Schema, Mock Generator, Prompt Template — built; Integration — pending)

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

## Phase 3 (Planned) — LLM Intent → Behavioral JSON

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

## Phase 4 (Planned) — Cross-Session Persistence