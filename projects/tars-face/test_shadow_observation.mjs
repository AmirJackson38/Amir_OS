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
    { field: "activity", frontend: "server_check", shadow: "idle" },
    { field: "location", frontend: "rack-a", shadow: "window_left" },
    { field: "metadata.worldVersion", frontend: 7, shadow: 8 }
]);
assert.equal(engine.getHealth().comparisons, 3);

const fixturePath = path.join(process.cwd(), "fixtures", "shadow-session.json");
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
assert.equal(fixture.schemaVersion, 1);
assert.equal(fixture.observations.length, 2);
assert.equal(new ComparisonEngine().compare(fixture.observations[0], null).status, "waiting");
assert.deepEqual(
    new ComparisonEngine().compare(fixture.observations[0], fixture.observations[1]).differences,
    fixture.expected.differences
);

console.log("Shadow observation tests: PASS");
