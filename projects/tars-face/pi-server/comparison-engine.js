const crypto = require("crypto");

const COMPARISON_FIELDS = Object.freeze([
    { field: "activity", category: "behavioral", severity: "error", read: state => state.activity },
    { field: "location", category: "behavioral", severity: "error", read: state => state.location },
    { field: "emotion", category: "behavioral", severity: "error", read: state => state.emotion },
    { field: "needs", category: "behavioral", severity: "error", read: state => state.needs },
    { field: "weather", category: "environment", severity: "warning", read: state => state.weather },
    { field: "timeOfDay", category: "environment", severity: "warning", read: state => state.timeOfDay },
    { field: "lightingProfile", category: "environment", severity: "warning", read: state => state.lightingProfile },
    { field: "objects", category: "objects", severity: "info", read: state => state.objects }
]);

const ALLOWED_STATE_FIELDS = new Set(COMPARISON_FIELDS.map(descriptor => descriptor.field));
const IGNORED_RENDERER_FIELDS = new Set([
    "camera",
    "camerastate",
    "fps",
    "particles",
    "interpolation",
    "visualeffects",
    "renderprofile"
]);
const FIELD_BY_NAME = new Map(COMPARISON_FIELDS.map(descriptor => [descriptor.field, descriptor]));

function hasOwn(value, key) {
    return Boolean(value && Object.prototype.hasOwnProperty.call(value, key));
}

function normalizeKey(key) {
    return String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function equalValue(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
}

function readLegacyState(value) {
    if (!value || typeof value !== "object") return {};
    if (value.state && typeof value.state === "object") return value.state;
    const state = {};
    if (hasOwn(value.tars, "activity")) state.activity = value.tars.activity;
    if (hasOwn(value.tars, "location")) state.location = value.tars.location;
    if (hasOwn(value.tars, "emotion")) state.emotion = value.tars.emotion;
    else if (hasOwn(value.tars, "mood")) state.emotion = value.tars.mood;
    if (hasOwn(value.tars, "needs")) state.needs = value.tars.needs;
    if (hasOwn(value.environment, "weather")) state.weather = value.environment.weather;
    if (hasOwn(value.environment, "timeOfDay")) state.timeOfDay = value.environment.timeOfDay;
    if (hasOwn(value.environment, "lightingProfile")) state.lightingProfile = value.environment.lightingProfile;
    if (hasOwn(value, "objects")) state.objects = value.objects;
    return state;
}

function readMetadata(value) {
    return {
        sessionId: value?.sessionId ?? null,
        worldVersion: value?.worldVersion ?? value?.runtime?.worldVersion ?? null,
        timestamp: value?.timestamp ?? value?.runtime?.serverTime ?? value?.generatedAt ?? null
    };
}

function difference({ field, category, kind, severity, expected, observed, detail }) {
    return {
        field,
        category,
        kind,
        severity,
        expected: expected ?? null,
        observed: observed ?? null,
        ...(detail ? { detail } : {})
    };
}

function severitySummary(differences) {
    return differences.reduce((summary, item) => {
        summary.total += 1;
        summary.bySeverity[item.severity] = (summary.bySeverity[item.severity] || 0) + 1;
        summary.byKind[item.kind] = (summary.byKind[item.kind] || 0) + 1;
        return summary;
    }, { total: 0, bySeverity: {}, byKind: {} });
}

function addUnexpectedFields(differences, state, side) {
    if (!state || typeof state !== "object") return;
    for (const [key, value] of Object.entries(state)) {
        const normalized = normalizeKey(key);
        if (ALLOWED_STATE_FIELDS.has(key) || IGNORED_RENDERER_FIELDS.has(normalized)) continue;
        differences.push(difference({
            field: `state.${key}`,
            category: "metadata",
            kind: "unexpected",
            severity: "warning",
            expected: null,
            observed: value,
            detail: `${side} observation contains a field outside the comparison contract`
        }));
    }
}

function addValueDifferences(differences, frontendState, shadowState) {
    for (const descriptor of COMPARISON_FIELDS) {
        const frontendHas = hasOwn(frontendState, descriptor.field);
        const shadowHas = hasOwn(shadowState, descriptor.field);
        const frontendValue = descriptor.read(frontendState);
        const shadowValue = descriptor.read(shadowState);
        if (!frontendHas || !shadowHas) {
            if (frontendHas !== shadowHas) {
                differences.push(difference({
                    field: descriptor.field,
                    category: descriptor.category,
                    kind: "missing",
                    severity: descriptor.severity,
                    expected: frontendHas ? frontendValue : null,
                    observed: shadowHas ? shadowValue : null,
                    detail: frontendHas ? "shadow field is missing" : "frontend field is missing"
                }));
            }
            continue;
        }
        if (!equalValue(frontendValue, shadowValue)) {
            differences.push(difference({
                field: descriptor.field,
                category: descriptor.category,
                kind: "value",
                severity: descriptor.severity,
                expected: frontendValue,
                observed: shadowValue
            }));
        }
    }
}

function addTransitionDifferences(differences, frontendState, shadowState, previousFrontendState, previousShadowState) {
    if (!previousFrontendState || !previousShadowState) return;
    for (const descriptor of COMPARISON_FIELDS) {
        const field = descriptor.field;
        if (!hasOwn(frontendState, field) || !hasOwn(shadowState, field)) continue;
        if (!hasOwn(previousFrontendState, field) || !hasOwn(previousShadowState, field)) continue;
        const frontendChanged = !equalValue(descriptor.read(previousFrontendState), descriptor.read(frontendState));
        const shadowChanged = !equalValue(descriptor.read(previousShadowState), descriptor.read(shadowState));
        if (frontendChanged !== shadowChanged) {
            differences.push(difference({
                field,
                category: descriptor.category,
                kind: "transition",
                severity: descriptor.severity,
                expected: { from: descriptor.read(previousFrontendState), to: descriptor.read(frontendState) },
                observed: { from: descriptor.read(previousShadowState), to: descriptor.read(shadowState) },
                detail: "frontend and shadow changed this field differently"
            }));
        }
    }
}

class ComparisonEngine {
    constructor(options = {}) {
        this.comparisons = 0;
        this.lastComparison = null;
        this.timingToleranceMs = Number.isFinite(options.timingToleranceMs) ? options.timingToleranceMs : 5000;
    }

    compare(frontendObservation, shadowObservation = null, options = {}) {
        const differences = [];
        const frontendState = readLegacyState(frontendObservation);
        const shadowState = readLegacyState(shadowObservation);
        const previousFrontendState = readLegacyState(options.previousFrontendObservation);
        const previousShadowState = readLegacyState(options.previousShadowObservation);
        const frontendMetadata = readMetadata(frontendObservation);
        const shadowMetadata = readMetadata(shadowObservation);
        const status = shadowObservation ? "compared" : "waiting";

        if (shadowObservation) {
            addValueDifferences(differences, frontendState, shadowState);
            addUnexpectedFields(differences, frontendState, "frontend");
            addUnexpectedFields(differences, shadowState, "shadow");
            addTransitionDifferences(
                differences,
                frontendState,
                shadowState,
                previousFrontendState,
                previousShadowState
            );

            if (frontendMetadata.sessionId !== null && shadowMetadata.sessionId !== null &&
                frontendMetadata.sessionId !== shadowMetadata.sessionId) {
                differences.push(difference({
                    field: "metadata.sessionId",
                    category: "metadata",
                    kind: "session",
                    severity: "error",
                    expected: frontendMetadata.sessionId,
                    observed: shadowMetadata.sessionId,
                    detail: "frontend and shadow sessions differ"
                }));
            }

            if (frontendMetadata.worldVersion !== null && shadowMetadata.worldVersion !== null &&
                frontendMetadata.worldVersion !== shadowMetadata.worldVersion) {
                differences.push(difference({
                    field: "metadata.worldVersion",
                    category: "metadata",
                    kind: "version",
                    severity: "warning",
                    expected: frontendMetadata.worldVersion,
                    observed: shadowMetadata.worldVersion,
                    detail: "frontend and shadow world versions differ"
                }));
            }

            const frontendTime = Date.parse(frontendMetadata.timestamp || "");
            const shadowTime = Date.parse(shadowMetadata.timestamp || "");
            const timingDeltaMs = Number.isFinite(frontendTime) && Number.isFinite(shadowTime)
                ? Math.abs(frontendTime - shadowTime)
                : null;
            if (timingDeltaMs !== null && timingDeltaMs > this.timingToleranceMs) {
                differences.push(difference({
                    field: "metadata.timestamp",
                    category: "metadata",
                    kind: "timing",
                    severity: "warning",
                    expected: frontendMetadata.timestamp,
                    observed: shadowMetadata.timestamp,
                    detail: `timestamp delta ${timingDeltaMs}ms exceeds ${this.timingToleranceMs}ms tolerance`
                }));
            }
        }

        const result = {
            comparisonId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            status,
            authoritative: false,
            frontendVersion: frontendMetadata.worldVersion,
            shadowVersion: shadowMetadata.worldVersion,
            session: {
                frontend: frontendMetadata.sessionId,
                shadow: shadowMetadata.sessionId,
                matched: frontendMetadata.sessionId === shadowMetadata.sessionId
            },
            timing: {
                frontend: frontendMetadata.timestamp,
                shadow: shadowMetadata.timestamp,
                toleranceMs: this.timingToleranceMs
            },
            differences,
            summary: severitySummary(differences)
        };
        this.comparisons += 1;
        this.lastComparison = result;
        return JSON.parse(JSON.stringify(result));
    }

    getHealth() {
        return {
            comparisons: this.comparisons,
            lastComparison: this.lastComparison ? JSON.parse(JSON.stringify(this.lastComparison)) : null
        };
    }
}

module.exports = {
    ComparisonEngine,
    COMPARISON_FIELDS,
    ALLOWED_STATE_FIELDS,
    IGNORED_RENDERER_FIELDS
};
