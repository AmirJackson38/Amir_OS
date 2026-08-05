const { assertValidSnapshot } = require("./snapshot-validator");

class SnapshotProvider {
    constructor(identityProvider, versionTracker) {
        this.identityProvider = identityProvider;
        this.versionTracker = versionTracker;
    }

    getSnapshot() {
        const runtime = this.identityProvider.getIdentity();
        const version = this.versionTracker.getCurrent();
        const snapshot = {
            type: "world.snapshot",
            schemaVersion: runtime.schemaVersion,
            eventId: `snapshot:${runtime.runtimeEpoch}:${version.worldVersion}`,
            runtime: {
                ...runtime,
                runtimeEpoch: version.runtimeEpoch,
                worldVersion: version.worldVersion,
                serverTime: new Date().toISOString()
            },
            world: {
                canonical: false,
                status: "shadow",
                authority: "frontend"
            },
            generatedAt: new Date().toISOString()
        };
        return assertValidSnapshot(snapshot, [runtime.schemaVersion]);
    }
}

module.exports = { SnapshotProvider };
