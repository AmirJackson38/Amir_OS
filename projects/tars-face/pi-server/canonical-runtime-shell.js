const crypto = require("crypto");
const { RuntimeIdentityProvider } = require("./runtime-identity");
const { VersionTracker } = require("./version-tracker");
const { RendererRegistry } = require("./renderer-registry");
const { SUPPORTED_SCHEMA_VERSIONS, validateRendererHello } = require("./protocol-validator");
const { SnapshotProvider } = require("./snapshot-provider");
const { RuntimeModeGuard } = require("./runtime-mode");

function send(ws, message) {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(message));
}

class CanonicalRuntimeShell {
    constructor(options = {}) {
        this.identityProvider = options.identityProvider || new RuntimeIdentityProvider({
            runtimeId: options.runtimeId,
            schemaVersion: options.schemaVersion,
            provenance: options.provenance
        });
        const identity = this.identityProvider.getIdentity();
        this.versionTracker = options.versionTracker || new VersionTracker({
            runtimeEpoch: identity.runtimeEpoch,
            worldVersion: identity.worldVersion
        });
        this.registry = options.registry || new RendererRegistry();
        this.snapshotProvider = options.snapshotProvider || new SnapshotProvider(this.identityProvider, this.versionTracker);
        this.supportedSchemaVersions = options.supportedSchemaVersions || SUPPORTED_SCHEMA_VERSIONS;
        this.modeGuard = options.modeGuard || new RuntimeModeGuard(options.mode);
        this.shadowObserver = options.shadowObserver || null;
        this.connections = new WeakMap();
    }

    getIdentity() {
        return this.identityProvider.getIdentity();
    }

    getSnapshot() {
        return this.snapshotProvider.getSnapshot();
    }

    getHealth() {
        const identity = this.getIdentity();
        const version = this.versionTracker.getCurrent();
        return {
            enabled: true,
            mode: this.modeGuard.getMode(),
            authority: "frontend",
            runtimeId: identity.runtimeId,
            instanceId: identity.instanceId,
            runtimeEpoch: version.runtimeEpoch,
            worldVersion: version.worldVersion,
            connectedRenderers: this.registry.size(),
            schemaVersion: identity.schemaVersion
        };
    }

    assertPersistenceWrite() {
        this.modeGuard.assertNoAuthorityInversion("persistence write");
    }

    assertCanonicalMutation(operation = "world mutation") {
        this.modeGuard.assertNoAuthorityInversion(operation);
    }

    getShadowHealth(comparisonCount = 0) {
        return this.shadowObserver?.getHealth
            ? this.shadowObserver.getHealth(comparisonCount)
            : {
                enabled: false,
                authority: "frontend",
                observer: "inactive",
                observations: 0,
                comparisons: comparisonCount,
                lastObservation: null
            };
    }

    handleMessage(ws, message) {
        if (message?.type === "shadow.observation") {
            if (!this.shadowObserver) {
                send(ws, { type: "shadow.observation.rejected", reason: "observer_unavailable" });
                return true;
            }
            try {
                const observation = this.shadowObserver.observeObservation(message.observation || message.payload);
                send(ws, {
                    type: "shadow.observation.accepted",
                    schemaVersion: observation.schemaVersion,
                    timestamp: observation.timestamp,
                    worldVersion: observation.worldVersion
                });
            } catch (error) {
                send(ws, {
                    type: "shadow.observation.rejected",
                    reason: "invalid_observation",
                    error: error.message
                });
            }
            return true;
        }
        if (message?.type === "canonical.mutation.request") {
            send(ws, {
                type: "interaction.rejected",
                schemaVersion: 1,
                requestId: message.requestId || null,
                reason: "authority_mode_blocked",
                mode: this.modeGuard.getMode()
            });
            return true;
        }
        if (message?.type !== "renderer.hello") return false;
        const validation = validateRendererHello(message, this.supportedSchemaVersions);
        if (!validation.valid || !validation.negotiatedSchemaVersion) {
            send(ws, {
                type: "renderer.upgrade_required",
                schemaVersion: 1,
                requiredSchemaVersions: [...this.supportedSchemaVersions],
                reason: validation.valid ? "unsupported_schema" : "invalid_renderer_hello",
                errors: validation.errors
            });
            return true;
        }

        const identity = this.getIdentity();
        const connectionId = crypto.randomUUID();
        const record = this.registry.connect({
            rendererId: message.rendererId,
            connectionId,
            rendererVersion: message.rendererVersion,
            schemaVersion: validation.negotiatedSchemaVersion,
            lastWorldVersion: message.lastWorldVersion,
            lastRuntimeEpoch: message.lastRuntimeEpoch
        });
        this.connections.set(ws, connectionId);
        ws._tarsRuntimeConnectionId = connectionId;

        send(ws, {
            type: "renderer.accepted",
            schemaVersion: identity.schemaVersion,
            connectionId,
            rendererId: record.rendererId,
            negotiatedSchemaVersion: record.schemaVersion,
            runtime: identity
        });
        send(ws, this.getSnapshot());
        return true;
    }

    handleDisconnect(ws) {
        const connectionId = this.connections.get(ws) || ws?._tarsRuntimeConnectionId;
        if (connectionId) this.registry.disconnect(connectionId);
        if (ws) delete ws._tarsRuntimeConnectionId;
    }
}

module.exports = { CanonicalRuntimeShell };
