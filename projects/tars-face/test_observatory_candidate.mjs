import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { FrontendObservationAdapter } = require("./frontend-observation-adapter.js");
const candidateSourceText = fs.readFileSync(path.join(__dirname, "observatory-data-layer-candidate.js"), "utf8");
const candidateModule = await import(`data:text/javascript,${encodeURIComponent(candidateSourceText)}`);
const {
    createObservatoryDataLayerCandidate,
    OBSERVATORY_CANDIDATE_SCHEMA_VERSION
} = candidateModule;

function makeClock(start = Date.parse("2026-08-05T13:00:00.000Z")) {
    let value = start;
    return {
        now: () => value,
        advance(ms = 1000) { value += ms; }
    };
}

function createEvent(type, payload = {}, source = "tars.test", category) {
    return {
        id: `fixture-${type}-${Math.random().toString(36).slice(2, 8)}`,
        version: 1,
        category: category || (type.startsWith("world.") ? "world" : type === "decision.made" ? "telemetry" : "state"),
        type,
        timestamp: "2026-08-05T13:00:00.000Z",
        source,
        payload
    };
}

function ingest(adapter, candidate, event) {
    const result = adapter.ingest({ event, sessionId: "candidate-test" }, candidate);
    assert.ok(result, `adapter accepted ${event.type}`);
}

function stripTiming(value) {
    const output = JSON.parse(JSON.stringify(value));
    if (output?.activity) delete output.activity.startedAt;
    if (output?.activity?.previousActivity) delete output.activity.previousActivity.endedAt;
    if (output?.world) delete output.world.lastSavedAt;
    return output;
}

function comparableMetrics(metrics) {
    const output = { ...metrics };
    delete output.lastUpdatedISO;
    delete output.lastUpdatedMs;
    return output;
}

function comparableInteraction(summary) {
    const output = JSON.parse(JSON.stringify(summary));
    if (output.lastInteraction) delete output.lastInteraction.timestamp;
    return output;
}

function extractLegacyObservatory() {
    const html = fs.readFileSync(path.join(__dirname, "tars_face_v1.html"), "utf8");
    const startMarker = "const EVENT_CATEGORY_MAP";
    const endMarker = "window.ObservatoryDataLayer = ObservatoryDataLayer;";
    const start = html.indexOf(startMarker);
    const end = html.indexOf(endMarker);
    assert.notEqual(start, -1, "legacy event bus marker exists");
    assert.notEqual(end, -1, "legacy observatory marker exists");

    global.window = { location: { search: "" }, dispatchEvent: () => {} };
    global.CustomEvent = class CustomEvent {
        constructor(type, options) { this.type = type; this.detail = options?.detail; }
    };
    const code = html.substring(start, end + endMarker.length);
    new Function("window", "console", "CustomEvent", code)(global.window, console, global.CustomEvent);
    return {
        layer: global.window.ObservatoryDataLayer,
        emit: global.window.emitTARSEvent
    };
}

console.log("Phase 10.3.1 candidate ObservatoryDataLayer tests\n");

// 1. Candidate isolation and interface.
const clock = makeClock();
const adapter = new FrontendObservationAdapter({ clock: () => new Date(clock.now()).toISOString() });
const candidate = createObservatoryDataLayerCandidate({ clock: clock.now });
assert.equal(OBSERVATORY_CANDIDATE_SCHEMA_VERSION, 1);
assert.equal(typeof candidate.ingest, "function");
assert.equal(typeof candidate.getProjectedState, "function");
assert.equal(typeof candidate.dispose, "function");

const sourceEvent = createEvent("activity.started", {
    activity: "computer_work",
    location: "desk",
    activityEndsAt: clock.now() + 20000,
    reason: "autonomous_move"
});
ingest(adapter, candidate, sourceEvent);
sourceEvent.payload.activity = "MUTATED";
assert.equal(candidate.getProjectedState().activity.current, "computer_work", "candidate copies adapter input");
assert.equal(candidate.getRawEvents()[0].payload.activity, "computer_work", "raw history is protected from source mutation");

// 2. Event coverage.
clock.advance();
ingest(adapter, candidate, createEvent("decision.made", {
    selectedActivity: "computer_work", selectedLocation: "desk", confidence: 0.85,
    decisionScore: 30.5, scoreComponents: { need: 1 }, alternatives: [{ activity: "idle", score: 2 }]
}, "tars.autonomy", "telemetry"));
ingest(adapter, candidate, createEvent("need.changed", { currentNeeds: { energy: 0.7 } }));
ingest(adapter, candidate, createEvent("weather.changed", { condition: "clear" }));
ingest(adapter, candidate, createEvent("world.loaded", { restoredFrom: "fixture" }));
ingest(adapter, candidate, createEvent("world.saved", { savedAtISO: "2026-08-05T13:01:00.000Z" }));
ingest(adapter, candidate, createEvent("world.interaction", {
    objectId: "ball", kind: "tap", impulse: 4.2, position: { x: 1, y: 2, z: 3 }, applied: true
}, "tars.world", "world"));
ingest(adapter, candidate, createEvent("world.physics.collision", { a: "ball", b: "floor" }, "tars.world", "world"));
ingest(adapter, candidate, createEvent("world.physics.impulse", { objectId: "ball" }, "tars.world", "world"));
ingest(adapter, candidate, createEvent("activity.completed", { activity: "computer_work", location: "desk", duration: 1000 }));
ingest(adapter, candidate, createEvent("activity.interrupted", { activity: "server_check", location: "rack-a", duration: 500 }));
ingest(adapter, candidate, createEvent("error.detected", { context: "test" }, "tars.test", "diagnostic"));

const projected = candidate.getProjectedState();
const metrics = candidate.getMetrics();
assert.equal(projected.activity.current, "computer_work");
assert.deepEqual(projected.needs, { energy: 0.7 });
assert.deepEqual(projected.environment.weather, { condition: "clear" });
assert.equal(projected.world.isLoaded, true);
assert.equal(metrics.decisionsCount, 1);
assert.equal(metrics.completedCount, 1);
assert.equal(metrics.interruptionCount, 1);
assert.equal(metrics.interactionsCount, 1);
assert.equal(metrics.collisionCount, 1);
assert.equal(metrics.impulseCount, 1);
assert.equal(metrics.errorCount, 1);
assert.equal(candidate.getWorldInteractionSummary().totalInteractionImpulse, 4.2);

// 3. Retention and mutation protection.
for (let i = 0; i < 125; i++) {
    ingest(adapter, candidate, createEvent("need.changed", { currentNeeds: { energy: i / 125 } }));
}
assert.equal(candidate.getRawEvents().length, 100);
for (let i = 0; i < 75; i++) {
    ingest(adapter, candidate, createEvent("decision.made", { selectedActivity: `activity_${i}`, confidence: 0.5 }, "tars.autonomy", "telemetry"));
}
assert.equal(candidate.getRecentDecisions().length, 50);
const projectedCopy = candidate.getProjectedState();
projectedCopy.activity.current = "MUTATED";
assert.notEqual(candidate.getProjectedState().activity.current, "MUTATED");
const decisionCopy = candidate.getLatestDecision();
decisionCopy.selectedActivity = "MUTATED";
assert.notEqual(candidate.getLatestDecision().selectedActivity, "MUTATED");

// 4. Fixture replay parity against the unchanged legacy implementation.
const legacy = extractLegacyObservatory();
const parityClock = makeClock();
const parityAdapter = new FrontendObservationAdapter({ clock: () => new Date(parityClock.now()).toISOString() });
const parityCandidate = createObservatoryDataLayerCandidate({ clock: parityClock.now });
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/phase94-behavior.json"), "utf8"));

for (const scenario of fixture.scenarios) {
    for (const observation of scenario.observations) {
        const state = observation.state || {};
        const activityEvent = createEvent("activity.started", {
            activity: state.activity,
            location: state.location,
            reason: `fixture:${scenario.id}`
        });
        legacy.emit(activityEvent.type, activityEvent.payload, activityEvent.source);
        ingest(parityAdapter, parityCandidate, activityEvent);
        const needEvent = createEvent("need.changed", { currentNeeds: state.needs });
        legacy.emit(needEvent.type, needEvent.payload, needEvent.source);
        ingest(parityAdapter, parityCandidate, needEvent);
        const weatherEvent = createEvent("weather.changed", state.weather || {});
        legacy.emit(weatherEvent.type, weatherEvent.payload, weatherEvent.source);
        ingest(parityAdapter, parityCandidate, weatherEvent);
        if (state.objects?.ball) {
            const interactionEvent = createEvent("world.interaction", {
                objectId: "ball", kind: "fixture", impulse: 0, position: state.objects.ball.position, applied: false
            }, "tars.world", "world");
            legacy.emit(interactionEvent.type, interactionEvent.payload, interactionEvent.source);
            ingest(parityAdapter, parityCandidate, interactionEvent);
        }
        parityClock.advance(1000);
    }
}

assert.deepEqual(stripTiming(parityCandidate.getProjectedState()), stripTiming(legacy.layer.getProjectedState()), "fixture projected state parity");
assert.deepEqual(comparableMetrics(parityCandidate.getMetrics()), comparableMetrics(legacy.layer.getMetrics()), "fixture metrics parity");
assert.deepEqual(parityCandidate.getRecentDecisions(), legacy.layer.getRecentDecisions(), "fixture decision parity");
assert.deepEqual(comparableInteraction(parityCandidate.getWorldInteractionSummary()), comparableInteraction(legacy.layer.getWorldInteractionSummary()), "fixture interaction parity");

// 5. Source-level isolation guard: candidate has no forbidden runtime access.
const candidateSource = candidateSourceText;
for (const forbidden of ["window", "document", "worldState", "localStorage", "TARS_AUTONOMY", "WorldPersistence", "THREE", "TARS_BEHAVIORAL_MEMORY"]) {
    assert.equal(candidateSource.includes(forbidden), false, `candidate source excludes ${forbidden}`);
}
const frontendSource = fs.readFileSync(path.join(__dirname, "tars_face_v1.html"), "utf8");
assert.equal(frontendSource.includes('import { createObservatoryDataLayerCandidate }'), false, "legacy mode has no static candidate import");
assert.equal(frontendSource.includes('import("/observatory-data-layer-candidate.js")'), true, "shadow mode dynamically loads candidate");
assert.equal(frontendSource.includes('requested === "shadow" ? "shadow" : "legacy"'), true, "legacy is the default observatory mode");
assert.equal(frontendSource.includes("adapter.ingest({ event }, candidate)"), true, "candidate receives data through adapter ingest");

candidate.dispose();
assert.equal(candidate.ingest({ event: createEvent("error.detected") }), false, "disposed candidate rejects input");

console.log("\nPASS: candidate isolation, event coverage, bounds, fixture parity, and mutation protection");
