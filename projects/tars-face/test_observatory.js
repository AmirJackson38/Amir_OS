/**
 * Phase 7.4.4 — ObservatoryDataLayer Unit Test
 * Extracts only TARS_EVENT_BUS + ObservatoryDataLayer code from tars_face_v1.html
 * and validates: event ingestion, decision artifacts, derived metrics, buffer caps.
 */
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "tars_face_v1.html"), "utf8");

// Mock browser globals
global.window = { location: { search: "" }, dispatchEvent: () => {} };
global.CustomEvent = class CustomEvent { constructor(t, o) { this.type = t; this.detail = o?.detail; } };
global.document = { addEventListener: () => {} };
global.localStorage = { getItem: () => null, setItem: () => {} };

// Extract only the event infrastructure + observatory data layer block
const startMarker = "const EVENT_CATEGORY_MAP";
const endMarker = "window.ObservatoryDataLayer = ObservatoryDataLayer;";

const startIdx = html.indexOf(startMarker);
const endIdx = html.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
    console.error("FATAL: Could not locate EVENT_CATEGORY_MAP or ObservatoryDataLayer in HTML.");
    process.exit(1);
}

const codeBlock = html.substring(startIdx, endIdx + endMarker.length);

// Evaluate in isolated function scope to avoid const collision
new Function("window", "console", "CustomEvent", codeBlock)(global.window, console, global.CustomEvent);

const ODL = global.window.ObservatoryDataLayer;
const emit = global.window.emitTARSEvent;

if (!ODL || !emit) {
    console.error("FATAL: ObservatoryDataLayer or emitTARSEvent not found on window.");
    process.exit(1);
}

let passed = 0;
let failed = 0;

function assert(label, condition) {
    if (condition) {
        console.log(`  ✅ ${label}`);
        passed++;
    } else {
        console.error(`  ❌ ${label}`);
        failed++;
    }
}

console.log("\n╔════════════════════════════════════════════════════════╗");
console.log("║   PHASE 7.4.4 — ObservatoryDataLayer Unit Tests      ║");
console.log("╚════════════════════════════════════════════════════════╝\n");

// ───────────────────────────────────────────────────
// TEST 1: Initialization
// ───────────────────────────────────────────────────
console.log("TEST 1: Initialization");
assert("ODL is initialized", ODL._initialized === true);
assert("rawEvents array exists", Array.isArray(ODL.rawEvents));
assert("recentDecisions array exists", Array.isArray(ODL.recentDecisions));
assert("projectedState has activity", ODL.projectedState.activity !== undefined);
assert("projectedState has environment", ODL.projectedState.environment !== undefined);
assert("projectedState has needs", ODL.projectedState.needs !== undefined);
assert("projectedState has world", ODL.projectedState.world !== undefined);
assert("derivedMetrics has freshness timestamp", ODL.derivedMetrics.lastUpdatedISO !== undefined);
assert("derivedMetrics has freshness ms", ODL.derivedMetrics.lastUpdatedMs !== undefined);

// ───────────────────────────────────────────────────
// TEST 2: Event Ingestion — activity.started
// ───────────────────────────────────────────────────
console.log("\nTEST 2: Event Ingestion — activity.started");
const expectedEnd = Date.now() + 20000;
emit("activity.started", {
    activity: "computer_work",
    location: "desk",
    activityEndsAt: expectedEnd,
    reason: "autonomous_move"
}, "tars.activity");

assert("rawEvents has 1 event", ODL.rawEvents.length === 1);
assert("projected activity = computer_work", ODL.projectedState.activity.current === "computer_work");
assert("projected location = desk", ODL.projectedState.activity.location === "desk");
assert("expectedEndAt is set", ODL.projectedState.activity.expectedEndAt === expectedEnd);
assert("reason = autonomous_move", ODL.projectedState.activity.reason === "autonomous_move");

// ───────────────────────────────────────────────────
// TEST 3: Event Ingestion — decision.made
// ───────────────────────────────────────────────────
console.log("\nTEST 3: Event Ingestion — decision.made");
emit("decision.made", {
    intent: "work",
    selectedActivity: "computer_work",
    selectedLocation: "desk",
    decisionScore: 30.5,
    confidence: 0.85,
    scoreGap: 12.5,
    alternatives: [{ activity: "reading", score: 18 }]
}, "tars.autonomy");

assert("decisionsCount = 1", ODL.derivedMetrics.decisionsCount === 1);
assert("averageConfidence = 0.85", ODL.derivedMetrics.averageConfidence === 0.85);
assert("latestDecision is set", ODL.latestDecision !== null);
assert("latestDecision.intent = work", ODL.latestDecision.intent === "work");
assert("recentDecisions has 1 entry", ODL.recentDecisions.length === 1);

// ───────────────────────────────────────────────────
// TEST 4: Event Ingestion — second decision (avg confidence)
// ───────────────────────────────────────────────────
console.log("\nTEST 4: Second Decision — Average Confidence");
emit("decision.made", {
    intent: "maintain",
    selectedActivity: "server_check",
    selectedLocation: "rack-a",
    decisionScore: 28.0,
    confidence: 0.65,
    scoreGap: 9.0
}, "tars.autonomy");

assert("decisionsCount = 2", ODL.derivedMetrics.decisionsCount === 2);
const expectedAvg = +((0.85 + 0.65) / 2).toFixed(3);
assert(`averageConfidence = ${expectedAvg}`, ODL.derivedMetrics.averageConfidence === expectedAvg);
assert("latestDecision updated to server_check", ODL.latestDecision.selectedActivity === "server_check");

// ───────────────────────────────────────────────────
// TEST 5: Event Ingestion — activity.completed
// ───────────────────────────────────────────────────
console.log("\nTEST 5: Event Ingestion — activity.completed");
emit("activity.completed", {
    activity: "computer_work",
    location: "desk",
    duration: 15000
}, "tars.activity");

assert("completedCount = 1", ODL.derivedMetrics.completedCount === 1);
assert("previousActivity recorded", ODL.projectedState.activity.previousActivity !== null);
assert("previousActivity.activity = computer_work", ODL.projectedState.activity.previousActivity.activity === "computer_work");
assert("previousActivity.duration = 15000", ODL.projectedState.activity.previousActivity.duration === 15000);

// ───────────────────────────────────────────────────
// TEST 6: Event Ingestion — activity.interrupted
// ───────────────────────────────────────────────────
console.log("\nTEST 6: Event Ingestion — activity.interrupted");
emit("activity.interrupted", {
    activity: "server_check",
    location: "rack-a",
    duration: 4000
}, "tars.activity");

assert("interruptionCount = 1", ODL.derivedMetrics.interruptionCount === 1);
assert("previousActivity.interrupted = true", ODL.projectedState.activity.previousActivity.interrupted === true);

// ───────────────────────────────────────────────────
// TEST 7: Event Ingestion — world.loaded
// ───────────────────────────────────────────────────
console.log("\nTEST 7: Event Ingestion — world.loaded");
emit("world.loaded", {
    restoredFrom: "2026-08-03T12:00:00Z",
    elapsedMs: 3600000
}, "tars.persistence");

assert("world.isLoaded = true", ODL.projectedState.world.isLoaded === true);
assert("world.lastLoadedFrom is set", ODL.projectedState.world.lastLoadedFrom === "2026-08-03T12:00:00Z");

// ───────────────────────────────────────────────────
// TEST 8: Event Ingestion — world.saved
// ───────────────────────────────────────────────────
console.log("\nTEST 8: Event Ingestion — world.saved");
emit("world.saved", { savedAtISO: "2026-08-03T18:32:00Z" }, "tars.persistence");

assert("saveCount = 1", ODL.derivedMetrics.saveCount === 1);
assert("world.lastSavedAt is set", ODL.projectedState.world.lastSavedAt === "2026-08-03T18:32:00Z");

// ───────────────────────────────────────────────────
// TEST 9: Event Ingestion — error.detected
// ───────────────────────────────────────────────────
console.log("\nTEST 9: Event Ingestion — error.detected");
emit("error.detected", { context: "test_error" }, "tars.system");

assert("errorCount = 1", ODL.derivedMetrics.errorCount === 1);

// ───────────────────────────────────────────────────
// TEST 10: Freshness Timestamps
// ───────────────────────────────────────────────────
console.log("\nTEST 10: Freshness Timestamps");
const m = ODL.getMetrics();
assert("lastUpdatedISO is ISO string", typeof m.lastUpdatedISO === "string" && m.lastUpdatedISO.includes("T"));
assert("lastUpdatedMs is recent", m.lastUpdatedMs > Date.now() - 5000);

// ───────────────────────────────────────────────────
// TEST 11: Public API — getRawEvents with category filter
// (Run BEFORE buffer stress tests evict state events)
// ───────────────────────────────────────────────────
console.log("\nTEST 11: Public API — getRawEvents with category filter");
const stateEvents = ODL.getRawEvents(100, "state");
const telemetryEvents = ODL.getRawEvents(100, "telemetry");
assert("Category-filtered state events exist", stateEvents.length > 0);
assert("Category-filtered telemetry events exist", telemetryEvents.length > 0);

// ───────────────────────────────────────────────────
// TEST 12: Phase 8.5 — world.interaction event ingestion
// ───────────────────────────────────────────────────
console.log("\nTEST 12: Phase 8.5 — world.interaction ingestion");
emit("world.interaction", {
    objectId: "ball",
    kind: "tap",
    impulse: 4.2,
    position: { x: 1.5, y: 0.2, z: -3.0 }
}, "tars.world");

assert("interactionsCount = 1", ODL.derivedMetrics.interactionsCount === 1);
assert("totalInteractionImpulse = 4.2", ODL.derivedMetrics.totalInteractionImpulse === 4.2);
const lastInter = ODL.getLastWorldInteraction();
assert("getLastWorldInteraction has objectId", lastInter && lastInter.objectId === "ball");
assert("getLastWorldInteraction kind = tap", lastInter && lastInter.kind === "tap");
assert("getLastWorldInteraction impulse = 4.2", lastInter && lastInter.impulse === 4.2);

// ───────────────────────────────────────────────────
// TEST 13: Phase 8.5 — world.physics.collision ingestion
// ───────────────────────────────────────────────────
console.log("\nTEST 13: Phase 8.5 — world.physics.collision ingestion");
emit("world.physics.collision", {
    a: "ball", b: "floor", impact: 12.5
}, "tars.world");

assert("collisionCount = 1", ODL.derivedMetrics.collisionCount === 1);
const summary = ODL.getWorldInteractionSummary();
assert("summary.interactionsCount = 1", summary.interactionsCount === 1);
assert("summary.collisionCount = 1", summary.collisionCount === 1);
assert("summary.impulseCount = 0", summary.impulseCount === 0);

// ───────────────────────────────────────────────────
// TEST 14: Phase 8.5 — world.physics.impulse ingestion
// ───────────────────────────────────────────────────
console.log("\nTEST 14: Phase 8.5 — world.physics.impulse ingestion");
emit("world.physics.impulse", {
    objectId: "ball", strength: 2.0, direction: { x: 0, y: 1, z: 0 }
}, "tars.world");

assert("impulseCount = 1", ODL.derivedMetrics.impulseCount === 1);
assert("impulse does not double-count user impulse", ODL.derivedMetrics.totalInteractionImpulse === 4.2);

// ───────────────────────────────────────────────────
// TEST 15: Phase 8.5 — world.event type falls in world category
// ───────────────────────────────────────────────────
console.log("\nTEST 15: Phase 8.5 — world.* events are world-categorized");
const worldEvts = ODL.getRawEvents(100, "world");
assert("world-category events exist", worldEvts.length >= 3);

// ───────────────────────────────────────────────────
// TEST 16: Buffer Limits — rawEvents (100 max)
// ───────────────────────────────────────────────────
console.log("\nTEST 16: Buffer Limits — rawEvents (100 max)");
const eventsBefore = ODL.rawEvents.length;
for (let i = 0; i < 150; i++) {
    emit("need.changed", { currentNeeds: { energy: 50 + i } }, "tars.engine");
}
assert(`rawEvents capped at ${ODL.maxEvents}`, ODL.rawEvents.length === ODL.maxEvents);

// ───────────────────────────────────────────────────
// TEST 17: Buffer Limits — recentDecisions (50 max)
// ───────────────────────────────────────────────────
console.log("\nTEST 17: Buffer Limits — recentDecisions (50 max)");
for (let i = 0; i < 100; i++) {
    emit("decision.made", {
        intent: "explore",
        selectedActivity: "wander",
        confidence: 0.5
    }, "tars.autonomy");
}
assert(`recentDecisions capped at ${ODL.maxDecisions}`, ODL.recentDecisions.length === ODL.maxDecisions);

// ───────────────────────────────────────────────────
// TEST 18: Public API — getProjectedState (deep copy)
// ───────────────────────────────────────────────────
console.log("\nTEST 18: Public API — getProjectedState returns deep copy");
const state1 = ODL.getProjectedState();
state1.activity.current = "MUTATED";
assert("Original not mutated", ODL.projectedState.activity.current !== "MUTATED");

// ───────────────────────────────────────────────────
// TEST 19: Public API — getRecentDecisions(count)
// ───────────────────────────────────────────────────
console.log("\nTEST 19: Public API — getRecentDecisions(count)");
const last5 = ODL.getRecentDecisions(5);
assert("getRecentDecisions(5) returns 5", last5.length === 5);

// ───────────────────────────────────────────────────
// TEST 20: Public API — getCurrentActivityDuration
// ───────────────────────────────────────────────────
console.log("\nTEST 20: Public API — getCurrentActivityDuration");
const dur = ODL.getCurrentActivityDuration();
assert("getCurrentActivityDuration returns number >= 0", typeof dur === "number" && dur >= 0);

// ───────────────────────────────────────────────────
// TEST 21: Public API — getActivityCountdown
// ───────────────────────────────────────────────────
console.log("\nTEST 21: Public API — getActivityCountdown");
const countdown = ODL.getActivityCountdown();
assert("getActivityCountdown returns number >= 0", typeof countdown === "number" && countdown >= 0);

// ───────────────────────────────────────────────────
// TEST 22: Internal Separation Verification
// ───────────────────────────────────────────────────
console.log("\nTEST 22: Internal Separation — Raw / Projected / Derived");
assert("rawEvents is array (raw storage)", Array.isArray(ODL.rawEvents));
assert("projectedState is object (projected observation)", typeof ODL.projectedState === "object");
assert("derivedMetrics is object (derived metrics)", typeof ODL.derivedMetrics === "object");
assert("Three concerns are distinct objects", ODL.rawEvents !== ODL.projectedState && ODL.projectedState !== ODL.derivedMetrics);

// ═══════════════════════════════════════════════════
// FINAL REPORT
// ═══════════════════════════════════════════════════
console.log("\n╔════════════════════════════════════════════════════════╗");
console.log(`║   RESULTS: ${passed} passed / ${failed} failed / ${passed + failed} total          ║`);
if (failed === 0) {
    console.log("║   🟢 PHASE 7.4.4 — ALL TESTS PASSED                  ║");
} else {
    console.log("║   🔴 PHASE 7.4.4 — SOME TESTS FAILED                 ║");
}
console.log("╚════════════════════════════════════════════════════════╝\n");

process.exit(failed > 0 ? 1 : 0);

