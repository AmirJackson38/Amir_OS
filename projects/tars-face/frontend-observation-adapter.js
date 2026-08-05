(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.FrontendObservationAdapter = api.FrontendObservationAdapter;
}(typeof window !== "undefined" ? window : globalThis, function () {
    const OBSERVATION_SCHEMA_VERSION = 1;

    function clone(value) {
        if (value === undefined) return undefined;
        return JSON.parse(JSON.stringify(value));
    }

    function defaultStateReader() {
        if (typeof window === "undefined") return null;
        return window.TARS_WORLD_STATE || window.worldState || null;
    }

    class FrontendObservationAdapter {
        constructor(options = {}) {
            this.stateReader = typeof options.stateReader === "function" ? options.stateReader : defaultStateReader;
            this.clock = typeof options.clock === "function" ? options.clock : () => new Date().toISOString();
            this.sessionReader = typeof options.sessionReader === "function"
                ? options.sessionReader
                : state => state?.session?.id || null;
        }

        capture(metadata = {}) {
            const state = this.stateReader();
            if (!state || typeof state !== "object") return null;
            const tars = state.tars || {};
            const environment = state.environment || {};
            return {
                schemaVersion: OBSERVATION_SCHEMA_VERSION,
                source: "frontend",
                timestamp: metadata.timestamp || this.clock(),
                sessionId: metadata.sessionId ?? this.sessionReader(state),
                worldVersion: Number.isInteger(metadata.worldVersion) && metadata.worldVersion >= 0
                    ? metadata.worldVersion
                    : null,
                state: {
                    activity: tars.activity ?? null,
                    location: tars.location ?? null,
                    needs: clone(tars.needs || {}),
                    emotion: clone(tars.emotion || { mood: tars.mood ?? null }),
                    weather: clone(environment.weather || {}),
                    timeOfDay: environment.timeOfDay ?? null,
                    lightingProfile: clone(environment.lightingProfile || null),
                    objects: clone(state.objects || {})
                }
            };
        }
    }

    return { FrontendObservationAdapter, OBSERVATION_SCHEMA_VERSION };
}));
