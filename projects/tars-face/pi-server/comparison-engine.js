const crypto = require("crypto");

const COMPARISON_FIELDS = Object.freeze([
    { field: "activity", read: state => state.activity },
    { field: "location", read: state => state.location },
    { field: "emotion", read: state => state.emotion },
    { field: "needs", read: state => state.needs },
    { field: "weather", read: state => state.weather },
    { field: "timeOfDay", read: state => state.timeOfDay },
    { field: "lightingProfile", read: state => state.lightingProfile },
    { field: "objects", read: state => state.objects },
    { field: "metadata.worldVersion", read: (_state, observation) => observation?.worldVersion ?? observation?.runtime?.worldVersion ?? null }
]);

function readLegacyState(value) {
    if (!value || typeof value !== "object") return {};
    if (value.state && typeof value.state === "object") return value.state;
    return {
        activity: value.tars?.activity ?? null,
        location: value.tars?.location ?? null,
        emotion: value.tars?.emotion ?? value.tars?.mood ?? null,
        needs: value.tars?.needs ?? null,
        weather: value.environment?.weather ?? null,
        timeOfDay: value.environment?.timeOfDay ?? null,
        lightingProfile: value.environment?.lightingProfile ?? null,
        objects: value.objects ?? null
    };
}

function equalValue(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
}

class ComparisonEngine {
    constructor() {
        this.comparisons = 0;
        this.lastComparison = null;
    }

    compare(frontendObservation, shadowObservation = null) {
        const differences = [];
        const frontendState = readLegacyState(frontendObservation);
        const shadowState = readLegacyState(shadowObservation);
        const frontendVersion = frontendObservation?.worldVersion ?? frontendObservation?.runtime?.worldVersion ?? null;
        const shadowVersion = shadowObservation?.worldVersion ?? shadowObservation?.runtime?.worldVersion ?? null;
        const status = shadowObservation ? "compared" : "waiting";

        if (shadowObservation) {
            for (const descriptor of COMPARISON_FIELDS) {
                const frontendValue = descriptor.read(frontendState, frontendObservation);
                const shadowValue = descriptor.read(shadowState, shadowObservation);
                if (!equalValue(frontendValue, shadowValue)) {
                    differences.push({ field: descriptor.field, frontend: frontendValue ?? null, shadow: shadowValue ?? null });
                }
            }
        }

        const result = {
            comparisonId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            status,
            authoritative: false,
            frontendVersion,
            shadowVersion,
            differences
        };
        this.comparisons += 1;
        this.lastComparison = result;
        return JSON.parse(JSON.stringify(result));
    }

    getHealth() {
        return { comparisons: this.comparisons, lastComparison: this.lastComparison ? { ...this.lastComparison } : null };
    }
}

module.exports = { ComparisonEngine, COMPARISON_FIELDS };
