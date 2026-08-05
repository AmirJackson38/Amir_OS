function normalizeVersion(version) {
    if (!version || !Number.isInteger(version.runtimeEpoch) || !Number.isInteger(version.worldVersion)) {
        throw new TypeError("version requires integer runtimeEpoch and worldVersion");
    }
    return {
        runtimeEpoch: version.runtimeEpoch,
        worldVersion: version.worldVersion
    };
}

function compareVersions(left, right) {
    const a = normalizeVersion(left);
    const b = normalizeVersion(right);
    if (a.runtimeEpoch !== b.runtimeEpoch) return a.runtimeEpoch > b.runtimeEpoch ? 1 : -1;
    if (a.worldVersion !== b.worldVersion) return a.worldVersion > b.worldVersion ? 1 : -1;
    return 0;
}

class VersionTracker {
    constructor(initial = { runtimeEpoch: 0, worldVersion: 0 }) {
        this.current = normalizeVersion(initial);
    }

    getCurrent() {
        return { ...this.current };
    }

    accept(version) {
        const candidate = normalizeVersion(version);
        const comparison = compareVersions(candidate, this.current);
        if (comparison < 0) return { accepted: false, reason: "stale", version: this.getCurrent() };
        if (comparison === 0) return { accepted: false, reason: "duplicate", version: this.getCurrent() };
        this.current = candidate;
        return { accepted: true, reason: "newer", version: this.getCurrent() };
    }

    acceptSnapshot(snapshot) {
        if (!snapshot || !snapshot.runtime) throw new TypeError("snapshot.runtime is required");
        return this.accept(snapshot.runtime);
    }
}

module.exports = { VersionTracker, compareVersions, normalizeVersion };
