const crypto = require("crypto");

let lastAllocatedEpoch = 0;

function allocateRuntimeEpoch() {
    const now = Date.now();
    lastAllocatedEpoch = Math.max(now, lastAllocatedEpoch + 1);
    return lastAllocatedEpoch;
}

function normalizedProvenance(value) {
    return typeof value === "string" && value.trim() ? value.trim() : "unknown";
}

class RuntimeIdentityProvider {
    constructor(options = {}) {
        this.runtimeId = options.runtimeId || process.env.TARS_RUNTIME_ID || "tars-primary";
        this.schemaVersion = Number.isInteger(options.schemaVersion) ? options.schemaVersion : 1;
        this.provenance = options.provenance || {};
        this.epochAllocator = options.epochAllocator || allocateRuntimeEpoch;
        this.identity = this.createIdentity();
    }

    createIdentity() {
        const generatedAt = new Date().toISOString();
        return Object.freeze({
            runtimeId: this.runtimeId,
            instanceId: crypto.randomUUID(),
            runtimeEpoch: this.epochAllocator(),
            sessionId: null,
            worldVersion: 0,
            gitSha: normalizedProvenance(this.provenance.gitSha),
            imageDigest: normalizedProvenance(this.provenance.imageDigest),
            schemaVersion: this.schemaVersion,
            generatedAt
        });
    }

    getIdentity() {
        return { ...this.identity };
    }
}

module.exports = { RuntimeIdentityProvider, allocateRuntimeEpoch };
