import assert from "node:assert/strict";
import http from "node:http";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { EventBus } = require("./pi-server/event-bus.js");
const { WsBridge } = require("./pi-server/ws-bridge.js");
const { CanonicalRuntimeShell } = require("./pi-server/canonical-runtime-shell.js");
const { RuntimeIdentityProvider } = require("./pi-server/runtime-identity.js");
const { VersionTracker } = require("./pi-server/version-tracker.js");
const { RuntimeModeGuard } = require("./pi-server/runtime-mode.js");
const { validateSnapshot } = require("./pi-server/snapshot-validator.js");
const { ShadowStateObserver } = require("./pi-server/shadow-state-observer.js");
const { ComparisonEngine } = require("./pi-server/comparison-engine.js");
const { WebSocket } = require("./pi-server/node_modules/ws");

function waitForMessage(ws, predicate, timeoutMs = 1500) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            ws.off("message", onMessage);
            reject(new Error("Timed out waiting for WebSocket message"));
        }, timeoutMs);
        const onMessage = raw => {
            const message = JSON.parse(raw.toString());
            if (!predicate(message)) return;
            clearTimeout(timer);
            ws.off("message", onMessage);
            resolve(message);
        };
        ws.on("message", onMessage);
    });
}

function collectMessages(ws, predicates, timeoutMs = 1500) {
    return new Promise((resolve, reject) => {
        const found = [];
        const timer = setTimeout(() => {
            ws.off("message", onMessage);
            reject(new Error("Timed out waiting for WebSocket messages"));
        }, timeoutMs);
        const onMessage = raw => {
            const message = JSON.parse(raw.toString());
            const index = predicates.findIndex((predicate, i) => !found[i] && predicate(message));
            if (index >= 0) found[index] = message;
            if (found.length === predicates.length && found.every(Boolean)) {
                clearTimeout(timer);
                ws.off("message", onMessage);
                resolve(found);
            }
        };
        ws.on("message", onMessage);
    });
}

function openSocket(url) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(url);
        ws.once("open", () => resolve(ws));
        ws.once("error", reject);
    });
}

async function main() {
    // Identity contract and restart semantics.
    const first = new RuntimeIdentityProvider({ runtimeId: "test-runtime", provenance: { gitSha: "abc", imageDigest: "sha256:test" } }).getIdentity();
    const second = new RuntimeIdentityProvider({ runtimeId: "test-runtime", provenance: { gitSha: "abc", imageDigest: "sha256:test" } }).getIdentity();
    assert.equal(first.runtimeId, "test-runtime");
    assert.notEqual(first.instanceId, second.instanceId);
    assert.ok(second.runtimeEpoch > first.runtimeEpoch);
    assert.equal(first.worldVersion, 0);
    assert.equal(first.schemaVersion, 1);
    assert.equal(first.gitSha, "abc");
    assert.equal(first.imageDigest, "sha256:test");

    // Version ordering contract.
    const tracker = new VersionTracker({ runtimeEpoch: 10, worldVersion: 2 });
    assert.equal(tracker.accept({ runtimeEpoch: 10, worldVersion: 1 }).reason, "stale");
    assert.equal(tracker.accept({ runtimeEpoch: 10, worldVersion: 2 }).reason, "duplicate");
    assert.equal(tracker.accept({ runtimeEpoch: 10, worldVersion: 3 }).accepted, true);
    assert.equal(tracker.accept({ runtimeEpoch: 11, worldVersion: 0 }).accepted, true);
    assert.equal(tracker.accept({ runtimeEpoch: 10, worldVersion: 99 }).reason, "stale");
    assert.equal(tracker.acceptSnapshot({ runtime: { runtimeEpoch: 12, worldVersion: 0 } }).accepted, true);

    // Snapshot contract rejects incomplete, incompatible, and private state.
    const validSnapshot = {
        type: "world.snapshot",
        schemaVersion: 1,
        runtime: {
            ...first,
            runtimeEpoch: 1,
            worldVersion: 0
        },
        world: { canonical: false, status: "shadow", authority: "frontend" }
    };
    assert.equal(validateSnapshot(validSnapshot).valid, true);
    assert.equal(validateSnapshot({ ...validSnapshot, runtime: { ...validSnapshot.runtime, worldVersion: -1 } }).valid, false);
    assert.equal(validateSnapshot({ ...validSnapshot, runtime: { runtimeEpoch: 1, worldVersion: 0 } }).valid, false);
    assert.equal(validateSnapshot({ ...validSnapshot, schemaVersion: 99 }).valid, false);
    assert.equal(validateSnapshot({ ...validSnapshot, world: { ...validSnapshot.world, cameraState: {} } }).valid, false);
    assert.equal(validateSnapshot({ ...validSnapshot, world: { ...validSnapshot.world, randomSeed: 42 } }).valid, false);
    assert.equal(validateSnapshot({ ...validSnapshot, world: { ...validSnapshot.world, candidateScores: {} } }).valid, false);
    assert.equal(validateSnapshot({ ...validSnapshot, world: { ...validSnapshot.world, rawTelemetry: [] } }).valid, false);

    // Runtime modes are explicit and the shell cannot mutate canonical state.
    assert.throws(() => new RuntimeModeGuard("legacy").assertCanMutate("persistence"), /mutation blocked/);
    assert.throws(() => new RuntimeModeGuard("shadow").assertCanMutate("worldState"), /mutation blocked/);

    const eventBus = new EventBus({ historySize: 20 });
    const shadowObserver = new ShadowStateObserver();
    const shell = new CanonicalRuntimeShell({
        runtimeId: "test-runtime",
        provenance: { gitSha: "abc", imageDigest: "sha256:test" },
        shadowObserver
    });
    const server = http.createServer();
    const bridge = new WsBridge(eventBus, { runtimeShell: shell });
    bridge.attach(server);
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const url = `ws://127.0.0.1:${address.port}`;

    const hello = {
        type: "renderer.hello",
        rendererId: "thinkpad-01",
        rendererVersion: "1.0",
        supportedSchemaVersions: [1],
        lastWorldVersion: 0,
        lastRuntimeEpoch: 0
    };

    const firstSocket = await openSocket(url);
    const firstMessages = collectMessages(firstSocket, [
        message => message.type === "renderer.accepted",
        message => message.type === "world.snapshot"
    ]);
    firstSocket.send(JSON.stringify(hello));
    const [accepted, snapshot] = await firstMessages;
    assert.ok(accepted.connectionId);
    assert.equal(accepted.negotiatedSchemaVersion, 1);
    assert.equal(snapshot.world.canonical, false);
    assert.equal(snapshot.world.authority, "frontend");
    assert.equal(snapshot.world.status, "shadow");
    assert.equal(snapshot.runtime.worldVersion, 0);
    assert.equal(snapshot.runtime.runtimeId, accepted.runtime.runtimeId);
    assert.equal(shell.getHealth().authority, "frontend");
    assert.equal(shell.getHealth().connectedRenderers, 1);

    // Duplicate renderer identities are valid separate connections.
    const secondSocket = await openSocket(url);
    const secondMessages = collectMessages(secondSocket, [
        message => message.type === "renderer.accepted",
        message => message.type === "world.snapshot"
    ]);
    secondSocket.send(JSON.stringify(hello));
    await secondMessages;
    assert.equal(shell.getHealth().connectedRenderers, 2);

    // Unsupported schema is rejected without entering the registry.
    const unsupportedSocket = await openSocket(url);
    const rejectedMessage = waitForMessage(unsupportedSocket, message => message.type === "renderer.upgrade_required");
    unsupportedSocket.send(JSON.stringify({ ...hello, rendererId: "old-renderer", supportedSchemaVersions: [99] }));
    const rejected = await rejectedMessage;
    assert.deepEqual(rejected.requiredSchemaVersions, [1]);
    assert.equal(shell.getHealth().connectedRenderers, 2);

    // Malformed renderer identities are rejected without registry mutation.
    const malformedSocket = await openSocket(url);
    const malformedMessage = waitForMessage(malformedSocket, message => message.type === "renderer.upgrade_required");
    malformedSocket.send(JSON.stringify({ ...hello, rendererId: "bad id" }));
    await malformedMessage;
    assert.equal(shell.getHealth().connectedRenderers, 2);

    // Legacy/shadow authority guard rejects mutation requests.
    const mutationSocket = await openSocket(url);
    const mutationMessage = waitForMessage(mutationSocket, message => message.type === "interaction.rejected");
    mutationSocket.send(JSON.stringify({ type: "canonical.mutation.request", requestId: "req-1" }));
    const mutationRejected = await mutationMessage;
    assert.equal(mutationRejected.reason, "authority_mode_blocked");
    mutationSocket.close();

    // Shadow observations are accepted as bounded diagnostics only.
    const shadowSocket = await openSocket(url);
    const shadowMessage = waitForMessage(shadowSocket, message => message.type === "shadow.observation.accepted");
    shadowSocket.send(JSON.stringify({
        type: "shadow.observation",
        observation: {
            schemaVersion: 1,
            source: "frontend",
            timestamp: "2026-08-05T12:00:00.000Z",
            sessionId: "test-session",
            worldVersion: 3,
            state: { activity: "idle", location: "spawn", needs: {}, weather: {}, emotion: {} }
        }
    }));
    const shadowAccepted = await shadowMessage;
    assert.equal(shadowAccepted.worldVersion, 3);
    assert.equal(shell.getShadowHealth().observations, 1);
    shadowSocket.close();

    unsupportedSocket.close();
    malformedSocket.close();
    firstSocket.close();
    secondSocket.close();
    await new Promise(resolve => setTimeout(resolve, 25));
    assert.equal(shell.getHealth().connectedRenderers, 0);

    bridge.close();
    await new Promise(resolve => server.close(resolve));

    // Isolation contract: the shell contains only identity, protocol, and
    // renderer metadata; it has no world/behavior/persistence authority.
    assert.equal(shell.worldState, undefined);
    assert.equal(shell.autonomy, undefined);
    assert.equal(shell.persistence, undefined);
    assert.equal(shell.behavioralMemory, undefined);
    assert.equal(shell.getHealth().authority, "frontend");

    // Phase 10.2 interfaces remain diagnostic-only and do not define truth.
    const observer = new ShadowStateObserver();
    observer.observeObservation({ source: "frontend", state: { activity: "idle" } });
    assert.equal(observer.getComparisonInput().source, "frontend");
    const comparison = new ComparisonEngine().compare(validSnapshot, validSnapshot);
    assert.equal(comparison.authoritative, false);
    assert.deepEqual(comparison.differences, []);

    console.log("Canonical runtime shell tests: PASS");
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
