import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { FrontendObservationAdapter } = require("./frontend-observation-adapter.js");
const {
    OBSERVATION_SCHEMA_VERSION,
    ShadowStateObserver,
    normalizeObservation
} = require("./pi-server/shadow-state-observer.js");
const { ComparisonEngine } = require("./pi-server/comparison-engine.js");

const worldState = {
    tars: {
        activity: "server_check",
        location: "rack-a",
        mood: "focused",
        needs: { energy: 0.8, curiosity: 0.3 }
    },
    environment: {
        weather: { condition: "rain", intensity: "moderate" },
        timeOfDay: 0.42,
        lightingProfile: { key: "daylight" }
    },
    objects: { ball: { position: { x: 1, y: 2, z: 3 }, sleeping: false } },
    session: { id: "session_fixture" }
};
const before = JSON.stringify(worldState);
const adapter = new FrontendObservationAdapter({
    stateReader: () => worldState,
    clock: () => "2026-08-05T12:00:00.000Z"
});
const observation = adapter.capture({ worldVersion: 7 });
assert.equal(observation.schemaVersion, OBSERVATION_SCHEMA_VERSION);
assert.equal(observation.source, "frontend");
assert.equal(observation.sessionId, "session_fixture");
assert.equal(observation.worldVersion, 7);
assert.equal(observation.state.activity, "server_check");
assert.equal(observation.state.location, "rack-a");
assert.equal(observation.state.emotion.mood, "focused");
assert.equal(JSON.stringify(worldState), before, "adapter must not mutate frontend state");

const observer = new ShadowStateObserver({ maxObservations: 2 });
assert.deepEqual(observer.getComparisonInput(), null);
observer.observeObservation(observation);
observer.observeObservation({ ...observation, worldVersion: 8, timestamp: "2026-08-05T12:00:01.000Z" });
observer.observeObservation({ ...observation, worldVersion: 9, timestamp: "2026-08-05T12:00:02.000Z" });
assert.equal(observer.getObservations().length, 2, "observer history must remain bounded");
assert.equal(observer.getLatest().worldVersion, 9);
assert.equal(observer.getHealth().authority, "frontend");
assert.equal(observer.getHealth().observer, "active");
assert.equal(observer.getHealth().lastObservationTime, "2026-08-05T12:00:02.000Z");
assert.equal(observer.getHealth().lastStateSource, "frontend");
assert.throws(() => normalizeObservation({ ...observation, source: "pi" }), /must come from frontend/);

const engine = new ComparisonEngine();
const waiting = engine.compare(observation, null);
assert.equal(waiting.status, "waiting");
assert.deepEqual(waiting.differences, []);

const equal = engine.compare(observation, observation);
assert.equal(equal.status, "compared");
assert.deepEqual(equal.differences, []);

const divergent = engine.compare(observation, {
    ...observation,
    worldVersion: 8,
    state: { ...observation.state, activity: "idle", location: "window_left" }
});
assert.equal(divergent.status, "compared");
assert.deepEqual(divergent.differences.slice(0, 3), [
    { field: "activity", category: "behavioral", kind: "value", severity: "error", expected: "server_check", observed: "idle" },
    { field: "location", category: "behavioral", kind: "value", severity: "error", expected: "rack-a", observed: "window_left" },
    { field: "metadata.worldVersion", category: "metadata", kind: "version", severity: "warning", expected: 7, observed: 8, detail: "frontend and shadow world versions differ" }
]);
assert.equal(divergent.summary.bySeverity.error, 2);
assert.equal(engine.getHealth().comparisons, 3);

// Missing and unexpected fields are explicit; renderer-only fields are ignored.
const incomplete = engine.compare(observation, {
    ...observation,
    state: { activity: "server_check", camera: { x: 1 }, fps: 60, futureField: true }
});
assert.ok(incomplete.differences.some(item => item.kind === "missing" && item.field === "location"));
assert.ok(incomplete.differences.some(item => item.kind === "unexpected" && item.field === "state.futureField"));
assert.ok(!incomplete.differences.some(item => item.field === "state.camera" || item.field === "state.fps"));

// Session, timing, and transition drift are independently classified.
const sessionTiming = engine.compare(observation, {
    ...observation,
    sessionId: "other-session",
    timestamp: "2026-08-05T12:00:20.000Z"
});
assert.ok(sessionTiming.differences.some(item => item.kind === "session"));
assert.ok(sessionTiming.differences.some(item => item.kind === "timing"));

const transition = engine.compare(
    observation,
    observation,
    {
        previousFrontendObservation: { ...observation, state: { ...observation.state, activity: "idle" } },
        previousShadowObservation: { ...observation, state: { ...observation.state, activity: "server_check" } }
    }
);
assert.ok(transition.differences.some(item => item.kind === "transition" && item.field === "activity"));

const fixturePath = path.join(process.cwd(), "fixtures", "shadow-session.json");
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
assert.equal(fixture.schemaVersion, 1);
assert.equal(fixture.observations.length, 2);
assert.equal(new ComparisonEngine().compare(fixture.observations[0], null).status, "waiting");
assert.deepEqual(
    new ComparisonEngine().compare(fixture.observations[0], fixture.observations[1]).differences,
    fixture.expected.differences
);

const phase94Fixture = JSON.parse(fs.readFileSync(path.join(process.cwd(), "fixtures", "phase94-behavior.json"), "utf8"));
assert.equal(phase94Fixture.schemaVersion, 1);
assert.deepEqual(phase94Fixture.scenarios.map(scenario => scenario.id), [
    "idle",
    "activity-start",
    "activity-complete",
    "location-transition",
    "object-interaction",
    "weather-transition",
    "persistence-state"
]);
assert.ok(phase94Fixture.scenarios.every(scenario => scenario.observations[0].source === "frontend"));
assert.equal(phase94Fixture.scenarios[4].observations[0].state.objects.ball.sleeping, false);
assert.equal(phase94Fixture.scenarios[6].observations[0].state.objects.ball.sleeping, true);

console.log("Shadow observation tests: PASS");
