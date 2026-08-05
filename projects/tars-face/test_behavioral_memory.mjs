import assert from "node:assert/strict";
import { createBehavioralMemory } from "./behavioral-memory.js";

function makeStorage(initial = {}) {
    const values = new Map(Object.entries(initial));
    return {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
        values
    };
}

const storage = makeStorage();
const memory = createBehavioralMemory({ storage, timezone: "UTC" });
memory.attach();
memory.startSession({ sessionId: "session_test", worldLoaded: true, rendererReady: true });

memory.ingest({
    id: "start-1",
    type: "activity.started",
    payload: { activity: "gaming", location: "desk" }
});
memory.ingest({
    id: "complete-1",
    type: "activity.completed",
    payload: { activity: "gaming", location: "desk", metadata: { duration: 42000 } }
});
memory.ingest({
    id: "complete-1",
    type: "activity.completed",
    payload: { activity: "gaming", location: "desk", metadata: { duration: 42000 } }
});

const closed = memory.closeSession("test", true);
assert.equal(closed.status, "closed");
assert.equal(closed.facts.activitiesCompleted, 1);
assert.equal(closed.facts.activities.gaming.durationSeconds, 42);
assert.equal(closed.facts.locations.desk.visits, 1);

const daily = memory.inspect({ date: closed.dayKey });
assert.equal(daily.facts.activitiesCompleted, 1);
assert.deepEqual(daily.sourceSessionIds, ["session_test"]);
assert.equal(daily.provenance.schemaVersion, 1);

const reloaded = createBehavioralMemory({ storage, timezone: "UTC" });
const snapshot = reloaded.inspect();
assert.ok(snapshot.sessions["session_test"]);
assert.ok(snapshot.dailySummaries[daily.memoryId]);
assert.equal(snapshot.health.schemaVersion, 1);

console.log("Behavioral memory tests: all passed");
