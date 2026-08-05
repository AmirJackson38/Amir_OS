const OBSERVATION_SCHEMA_VERSION = 1;
const MAX_OBSERVATIONS = 100;

function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
}

function copyState(state = {}) {
    const tars = state.tars || {};
    const environment = state.environment || {};
    return {
        activity: tars.activity ?? null,
        location: tars.location ?? null,
        needs: clone(tars.needs || {}),
        emotion: clone(tars.emotion || { mood: tars.mood ?? null }),
        weather: clone(environment.weather || {}),
        timeOfDay: environment.timeOfDay ?? null,
        lightingProfile: clone(environment.lightingProfile || null),
        objects: clone(state.objects || {})
    };
}

function normalizeObservation(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        throw new TypeError("frontend observation must be an object");
    }
    const state = input.state || {};
    if (!state || typeof state !== "object" || Array.isArray(state)) {
        throw new TypeError("frontend observation state must be an object");
    }
    const timestamp = typeof input.timestamp === "string" && input.timestamp
        ? input.timestamp
        : new Date().toISOString();
    const source = input.source || "frontend";
    if (source !== "frontend") throw new Error("shadow observations must come from frontend");
    return {
        schemaVersion: Number.isInteger(input.schemaVersion) ? input.schemaVersion : OBSERVATION_SCHEMA_VERSION,
        source,
        timestamp,
        sessionId: input.sessionId ?? null,
        worldVersion: Number.isInteger(input.worldVersion) && input.worldVersion >= 0 ? input.worldVersion : null,
        state: copyState(state)
    };
}

class ShadowStateObserver {
    constructor(options = {}) {
        this.maxObservations = Number.isInteger(options.maxObservations) && options.maxObservations > 0
            ? options.maxObservations
            : MAX_OBSERVATIONS;
        this.observations = [];
    }

    observeObservation(observation) {
        const normalized = normalizeObservation(observation);
        this.observations.push(normalized);
        if (this.observations.length > this.maxObservations) this.observations.shift();
        return clone(normalized);
    }

    // Compatibility adapter for event-bus shaped input. It remains observational.
    observe(event) {
        if (!event || typeof event !== "object") return null;
        const input = event.observation || event.payload || event.data || event;
        try {
            return this.observeObservation({
                ...input,
                source: input.source || event.source || "frontend",
                timestamp: input.timestamp || event.timestamp
            });
        } catch {
            return null;
        }
    }

    getObservations() {
        return clone(this.observations);
    }

    getLatest() {
        const latest = this.observations[this.observations.length - 1];
        return latest ? clone(latest) : null;
    }

    getComparisonInput() {
        return this.getLatest();
    }

    getHealth(comparisons = 0) {
        const latest = this.getLatest();
        return {
            enabled: true,
            authority: "frontend",
            observer: "active",
            observations: this.observations.length,
            comparisons,
            lastObservationTime: latest?.timestamp || null,
            lastStateSource: latest?.source || null,
            lastObservation: latest ? {
                timestamp: latest.timestamp,
                sessionId: latest.sessionId,
                worldVersion: latest.worldVersion,
                source: latest.source
            } : null
        };
    }
}

module.exports = {
    OBSERVATION_SCHEMA_VERSION,
    MAX_OBSERVATIONS,
    normalizeObservation,
    ShadowStateObserver
};
