# TARS Phase 8.5 — Embodied Interaction Layer Blueprint

**Status**: DESIGN ONLY — no implementation yet. Awaiting approval.
**Date**: 2026-08-03
**Base commit**: `40f904b` (Phase 8.4 observable spatial runtime foundation)

> Goal: turn TARS from a rendered simulation into an interactive world where a user
> (Amir) can touch/flick objects on the touchscreen, physics responds naturally, and
> TARS's existing autonomy (needs, fatigue, curiosity, preferences, activity scoring,
> experience buffer) decides how to react — while **never confusing a menu tap for a
> world touch**.

---

## 1. Audit Summary (grounded in committed code)

All references are to `projects/tars-face/tars_face_v1.html` at `40f904b`.

### 1.1 TARS_PHYSICS (line 705)
- `objects: Map`, `gravity: Vector3(0,-9.8,0)`, temp `_vec3/_vec3b` scratch vectors.
- `update(dt)` steps: `applyGravity` → `moveObject` → `resolveCollisions` → `sleepCheck`, clamped to `step = min(dt, 0.033)`.
- `interact(ballId, fromPos, strength)` (line 840): **already applies an impulse** — wakes object, computes direction away from `fromPos`, adds velocity scaled by distance falloff. This is the existing primitive a touch-flick would reuse.
- Ball registered (line 6812) with velocity, restitution 0.7, friction 0.35, sleeping/sleepTimer.
- **Gaps**: impulses emit no events; collisions emit no events; sleep/wake emit no events. Physics is mute — autonomy cannot observe it.

### 1.2 TARS_WORLD_OBJECTS (line 500)
- Registry `_registry: Map`, 4 semantic zones, presence levels (visual/spatial/collision/interactive/physics).
- Interaction flags already defined: `canPickup/canPush/canObserve/canRest/canTurnOn/canPlay/canToggle/canSit` + future flags (`canBeMoved/canBePickedUp/canBePushed/canBeObserved/canBeRemembered/canSleep`) + `futureTags`.
- `queryNearby`, `getByInteraction(flag)`, `getInteractiveObjects()`, `getZoneForPosition` exist.
- 11 registered objects (floor, ceiling, walls, viewport, desk, racks, plants) + ball (interactive: canPush/canObserve).
- **Gaps**: interaction flags are inert metadata — nothing consumes `getInteractiveObjects()` for input.

### 1.3 TARS_COLLISION (line 594)
- Pure-math primitives: point/box/capsule/plane distance, sphere×box/capsule/plane intersection, nearest-obstacle, avoidance vector.
- Used by physics `resolveCollisions` and movement avoidance.
- **Gap**: no raycast/picking function (Raycaster must come from Three, already available in r161).

### 1.4 Render loop (line 5951 `animate()`)
- `requestAnimationFrame` + `THREE.Clock`; `TARS_PHYSICS.update(dt)` called at line 6045.
- Ball glow pulse (6048), ball self-play interaction when TARS is close (6218–6247, hardcoded in the loop).
- Camera parallax driven by `mouseX/mouseY` from a single `window pointermove` (line 5937).

### 1.5 Input handling (current reality)
- **Only** `window.addEventListener("pointermove", ...)` (line 5937) → camera parallax.
- **No** `pointerdown/pointerup/pointermove` on the canvas, **no** `Raycaster`, **no** touch handling, **no** canvas click handler anywhere.
- UI input is fully DOM-based: toolbar buttons, `#tars-overlay` body click delegation (lines 8095, 8250), chat, F3 / Ctrl+Shift+D (line 8261).
- **Conclusion**: there is currently *zero* world-picking input — the touchscreen path does not exist yet, so nothing can leak from UI→world today. The design must build the classifier so this stays true.

### 1.6 Activity system
- `ACTIVITY_REGISTRY` (line 3238) with 8 activities; `play_with_ball` (3317) → location `["ball"]`, `requiredObject: "ball"`, needsSatisfied curiosity+comfort, priority LOW, min/max 8–25s.
- `selectBestActivity()` (5236) scores needs/preference/fatigue/curiosity/recency/weather/idle components; returns winner + topAlternatives + winnerComponents.
- `scoreLocation()` (5160) includes a `ball` location mapping and object preferences.
- `ACTIVITY_INTENT_MAP` (5417): `play_with_ball → "play"`.
- `makeAutonomousDecision()` (5531): gated by 2–4s cooldown (`lastDecisionTime`), `controlMode==="llm"`, blocking FX, and `activityEndsAt` (does not interrupt an active activity).
- `setTARSActivity()` (3590) is the **single canonical emitter** for activity lifecycle → `logActivityEvent()` → event bus.
- `recordAutonomyDecision()` (5480) emits full `decision.made` artifacts.

### 1.7 TARS_EVENT_BUS (line 2850)
- `emit(type, payload, source)` → canonical event `{id, version, category, type, timestamp, source, payload}`; ring buffer (100); typed + wildcard subscribers; mirrors to DOM `tars-event`/`tars-telemetry` CustomEvents.
- `EVENT_CATEGORY_MAP` (2825) already reserves **`user.interaction` → "user"** category — never used yet. No `world.*` categories exist.
- `emitTARSEvent` / `subscribeTARSEvent` wrappers.

### 1.8 Observatory telemetry (ObservatoryDataLayer, line 2934)
- Subscribes to 9 topics; `ingestEvent` updates projected state + derived metrics; raw ring (100), decisions ring (50).
- Tracks `activity.*`, `decision.made`, `need.changed`, `weather.changed`, `world.loaded/saved`, `error.detected`.
- **Gap**: no awareness of `world.interaction` / physics events → observatory cannot show "what did Amir touch".

### 1.9 Persistence model (WorldPersistence, line 2679)
- localStorage `tars_world_state_v1`, version 2; saves `tars.*`, environment, `worldMemory` (20 cap).
- `persistWorldEvent()` (2806) → `worldMemory` (curated, cross-session).
- `experienceBuffer` (100 cap) via `finalizeExperience()` (5398); entry = activity/location/duration/startedAt/endedAt/fatigueAtEnd/needsSnapshot.
- **Gap**: dynamic object transforms (ball position/velocity) are **not persisted** — ball resets on refresh.

### 1.10 Existing interruption system (important existing hook)
- `queueWorldEvent(label, priority, metadata)` (3486) + `processWorldEvents()` (3499): priority-based; if `top.priority > currentActivity.priority`, interrupts → logs to activityLog + worldMemory, `TARS.lookAt(gazeTarget)`. Otherwise drains silently.
- This is a ready-made "force TARS's attention" channel the world sensor can reuse for high-salience events (e.g., ball flicked hard at TARS).

---

## 2. Architecture

```
                 Touch / Pointer Input
                           |
                  TARS_INPUT_CLASSIFIER
                    (source layer guard)
                           |
              +------------+----------------+
              |                             |
              v                             v
         UI SYSTEM                    TARS_WORLD_SENSOR
   (existing DOM handlers)        (Raycaster + gesture detect)
   menus/settings/observatory     touching/flicking objects
   chat/dev tools/buttons         → world.interaction events
              |                             |
              v                             v
   controls TARS (existing)       TARS_PHYSICS (impulse/collision)
                                  → world.physics.* events
                                  → TARS_WORLD_AGENT
                                       ↓
                              autonomy response pipeline
                                  (join/investigate/ignore/respond-later)
```

**Governing rule (answers the core question):**

> *"What architecture allows Amir to touch the world without confusing TARS when Amir is simply using menus?"*

**Two independent guard layers, both enforced by construction, not by convention:**

1. **Listener separation** — UI handlers are bound to UI root containers (`#tars-toolbar`, `#tars-overlay`, `#tars-chat`, `#hud`, `#tars-status-header`, `.tars-*`). World handlers are bound **only** to `renderer.domElement` (the canvas). A pointer event is delivered to exactly one of these based on which DOM node the browser hit-tests to. A tap on a menu button physically cannot reach the world listener.
2. **Classifier suspension** — while any overlay is open (`TARS_UI.overlayVisible`, chat open, or F3 fullscreen), the world sensor is **suspended** (or its hit-region clipped to canvas area not covered by UI). Even if a finger lands on visible canvas next to an open panel, no world event is generated while a UI layer is active.
3. **Event type separation** — UI never emits `world.*`; the world sensor never emits `user.*`/UI actions. Physics objects cannot trigger UI actions (default behavior; see §8).

---

## 3. Component Designs

### 3.1 TARS_INPUT_CLASSIFIER (new, ~1 module)
- **Source layer detection**: read `event.target` / `composedPath()`. If the nearest hit node belongs to a UI subtree (or `data-tars-ui` attr) → route to UI path (already handled by DOM; classifier only needs to ignore it). If hit is `renderer.domElement` (canvas) → world path.
- **Suspension**: if `TARS_UI.overlayVisible` or chat open → drop world pointer events (still allow camera parallax).
- **Gesture classification** for world events (per touch/pointer, using pointerId + timestamps):
  - `tap` — pointerdown→up, movement < ~12px, duration < ~300ms → small impulse / observe.
  - `flick` — pointerdown→up with velocity > threshold → impulse ∝ velocity along travel vector.
  - `drag` — sustained press with movement, released → throw / place.
  - `hold` — sustained press, no movement → "poke/observe" (curiosity probe).
- **Output**: a normalized `{ kind, objectId|null, screenPos, worldPos, velocity, impulse }` structure handed to the world sensor — nothing is applied until classification completes.
- **Retains** existing `pointermove` parallax behavior unchanged when not over UI.

### 3.2 TARS_WORLD_SENSOR (new)
- Owns a `THREE.Raycaster` (built into three r161; no new dependency).
- `pick(screenPos)`: unproject against camera → ray; intersect against interactive objects (`TARS_WORLD_OBJECTS.getInteractiveObjects()` + physics objects meshes). Returns nearest object or null.
- `onPointerDown/onPointerMove/onPointerUp`: track pointerId, accumulate travel, classify, and on release:
  - If picked object: emit **`world.interaction`** and, if `interaction.canPush`/`canBeMoved`, apply impulse via `TARS_PHYSICS.interact(obj.id, worldPos, strength)`.
  - If no object picked (empty room tap): emit a low-salience **`world.interaction`** with `objectId: null` (an ambient attention cue — feeds curiosity, not a push).
- Emits canonical events through `emitTARSEvent` with `source: "tars.sensor"`.

### 3.3 TARS_PHYSICS event hooks (small, additive)
Add emission (not logic) inside existing methods:
- after `interact()` applies impulse → **`world.physics.impulse`** `{objectId, position, velocity, strength, source}`.
- in `resolveCollisions`, when a dynamic object hits a non-decorative object with impact above an energy threshold → **`world.physics.collision`** `{objectId, otherId, position, impulse}` (deduped per collision pair + time window to avoid spam).
- on `sleepCheck` transitions → **`world.physics.sleep`** / **`world.physics.wake`**.
These make physics observable by autonomy, Observatory, and (future) LLM. **No UI action ever results from these.**

### 3.4 TARS_WORLD_AGENT (new, ~1 module)
The autonomy-facing consumer. Subscribes to `world.interaction` and `world.physics.*`.

**Response decision uses ONLY existing systems** — no new scoring engine:
1. **Gate**: `controlMode==="llm"` → defer to LLM channel (emit a `user.interaction`/context event, don't act). Autonomy gate from `makeAutonomousDecision` reused.
2. **Salience** = f(impulse strength, object novelty, proximity to TARS, user.attention count). High salience → `queueWorldEvent(..., PRIORITY.HIGH)` so the existing interruption system can grab attention; low → ambient.
3. **Response scoring pass** (mirrors `selectBestActivity` math, additive to activity candidates):
   - `join_play`: bonus = curiosity deficit × object pref (`play_with_ball`) + social deficit (user initiated) + proximity − `activityFatigue[play_with_ball]` − recency. If winner → `setTARSActivity("play_with_ball", "ball", "user_initiated_play")`.
   - `investigate`: winner → `TARS.lookAt(objectId)` + short dwell, no activity switch (reuses existing gaze).
   - `ignore`: record observation only (`memory.created`-style lightweight telemetry, low priority).
   - `respond_later`: if an activity is active and can't be interrupted (blocking FX, controlMode llm, high-priority task) → push a deferred interaction into a bounded `deferredInteractions` queue; re-evaluated when autonomy frees (reuse cooldown/idle gating).
4. **Cooldown**: reuse `lastDecisionTime` pattern so repeated taps don't thrash; responses gated similarly to `makeAutonomousDecision`.
5. All actions route through existing emitters: `setTARSActivity`, `TARS.lookAt`, `TARS.setEmotion`, `queueWorldEvent` → full telemetry for free via existing `decision.made` / `activity.*` events.

### 3.5 World event schema (new `world.*` categories)
Add to `EVENT_CATEGORY_MAP`:
```
"world.interaction":       "world",   // user touched/flicked an object (or empty space)
"world.physics.impulse":   "world",
"world.physics.collision": "world",
"world.physics.sleep":     "world",
"world.physics.wake":      "world",
"world.object.moved":      "world",
"user.attention":          "user",    // aggregated user engagement signal (new, distinct from existing user.interaction reserved slot)
```
Canonical payload for `world.interaction`:
```js
{
  id: "world.int_<ts>_<rnd>",
  objectId: "ball" | null,
  kind: "tap" | "flick" | "drag" | "hold",
  position: {x,y,z},          // world coords
  screen: {x,y},              // normalized
  velocity: {x,y,z},          // finger/gesture velocity (world units/s)
  impulse: 0..1,              // normalized strength applied
  durationMs: number,
  source: "user"
}
```

### 3.6 Observatory integration
`ObservatoryDataLayer` gains subscriptions to `world.interaction` and `world.physics.*`:
- derived metrics: `interactionsCount`, `lastInteractionObject`, `lastInteractionKind`, `collisionCount`.
- projectedState gets `world.interactions` summary → shown in the Observatory's world view. This keeps the observatory data-layer-only (no direct sensor reads).

### 3.7 Persistence / memory integration
- **Object state**: add `worldState.objects` snapshot (bounded) persisted via `WorldPersistence.capture()` (additive, version-bumped to 3): per dynamic object `{id, position, sleepState, lastInteraction}`. Restored on load so the ball stays where Amir left it. Physics *transient* velocity is intentionally not persisted (reconstructed on wake).
- **Experience enrichment**: extend `finalizeExperience()` entry with `{ interactions: n, userInitiated: true, objects: [ids] }` (additive, backward-compatible) so the experience buffer remembers that a session was user-initiated play.
- **worldMemory**: persist salient interactions via existing `persistWorldEvent` (e.g., first-time interaction with an object, high-salience flick) → cross-session memory the autonomy/LLM can read.
- **Preference learning (schema only, future)**: repeated user-initiated play → upward drift of `preferences.activities.play_with_ball` / `preferences.objects.ball` over time. Designed, not implemented in this phase.

### 3.8 Future object/UI boundary strategy (defaults)
- **Default off**: world physics never triggers UI; UI never triggers world. Enforced by listener separation + classifier suspension (§2).
- **Explicit bridge (future)**: a dedicated opt-in `TARS_WORLD_UI_BRIDGE` with an allow-list (e.g., "ball bounced into desk hotspot" → visual reaction only). Any future world→UI effect must go through this module; physics code never calls UI directly. This keeps the invariant auditable in one place.
- Collision tiers already separate concerns (`DECORATIVE` never collides with physics); UI is simply **not** part of the world registry — it cannot be picked, pushed, or collide. This is the structural guarantee that a menu can never be "knocked over" or a button "flicked."

---

## 4. What does NOT change
- No changes to `selectBestActivity`, `scoreLocation`, `makeAutonomousDecision` logic (response pass is additive to existing scoring data).
- No changes to activity registry semantics or needs/fatigue math.
- No new physics library; `TARS_PHYSICS`/`TARS_COLLISION` remain the only physics layer.
- No UI layout changes; toolbar/overlay/chat DOM untouched.
- Frontend stays a single file (no modularization in this phase).

## 5. What is added (implementation checklist — pending approval)
1. `TARS_INPUT_CLASSIFIER` — pointer routing + gesture detection + suspension.
2. `TARS_WORLD_SENSOR` — Raycaster picking + interaction emission.
3. Event hooks in `TARS_PHYSICS` (impulse/collision/sleep/wake emission only).
4. `TARS_WORLD_AGENT` — response pipeline (join/investigate/ignore/respond-later).
5. `EVENT_CATEGORY_MAP` additions + `ObservatoryDataLayer` world subscriptions + metrics.
6. Persistence: `worldState.objects` snapshot (version 3), experience enrichment, salient worldMemory.
7. Regression test extension (`test_observatory.js`) for new event types.

## 6. Acceptance criteria (proposed)
- Tapping a menu/overlay/chat button produces **zero** `world.*` events (asserted in test).
- Flicking the ball applies an impulse that matches finger direction/strength.
- A ball collision emits exactly one `world.physics.collision` (deduped).
- `play_with_ball` becomes TARS's activity after a strong flick when curiosity/social deficits favor play; otherwise TARS investigates, ignores, or defers.
- Observatory world view shows last interaction + interaction count.
- Ball position survives a page refresh.

---

**Awaiting approval before any code is written.**
