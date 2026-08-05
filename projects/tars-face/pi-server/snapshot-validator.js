const FORBIDDEN_KEYS = new Set([
    "autonomyscores",
    "autonomyscoring",
    "autonomycandidates",
    "candidateactivities",
    "candidatescores",
    "decisioncandidates",
    "decisionscores",
    "randomseed",
    "randomstate",
    "persistenceslots",
    "persistenceinternals",
    "privatediagnostics",
    "debughistory",
    "rawtelemetry",
    "telemetry",
    "camerastate",
    "camera"
]);

function normalizedKey(key) {
    return String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findForbiddenKeys(value, path = "snapshot", errors = []) {
    if (!value || typeof value !== "object") return errors;
    if (Array.isArray(value)) {
        value.forEach((entry, index) => findForbiddenKeys(entry, `${path}[${index}]`, errors));
        return errors;
    }
    for (const [key, child] of Object.entries(value)) {
        if (FORBIDDEN_KEYS.has(normalizedKey(key))) errors.push(`${path}.${key} is forbidden`);
        findForbiddenKeys(child, `${path}.${key}`, errors);
    }
    return errors;
}

function validateSnapshot(snapshot, supportedSchemaVersions = [1]) {
    const errors = [];
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
        return { valid: false, errors: ["snapshot must be an object"] };
    }
    if (snapshot.type !== "world.snapshot") errors.push("type must be world.snapshot");
    if (!Number.isInteger(snapshot.schemaVersion) || !supportedSchemaVersions.includes(snapshot.schemaVersion)) {
        errors.push("unsupported or invalid schemaVersion");
    }
    if (!snapshot.runtime || typeof snapshot.runtime !== "object") {
        errors.push("runtime identity is required");
    } else {
        for (const field of ["runtimeId", "instanceId", "gitSha", "imageDigest", "generatedAt"]) {
            if (typeof snapshot.runtime[field] !== "string" || snapshot.runtime[field].length === 0) {
                errors.push(`runtime.${field} is required`);
            }
        }
        for (const field of ["runtimeEpoch", "worldVersion", "schemaVersion"]) {
            if (!Number.isInteger(snapshot.runtime[field]) || snapshot.runtime[field] < 0) {
                errors.push(`runtime.${field} must be a non-negative integer`);
            }
        }
    }
    if (!snapshot.world || typeof snapshot.world !== "object" || Array.isArray(snapshot.world)) {
        errors.push("world is required");
    } else {
        if (typeof snapshot.world.canonical !== "boolean") errors.push("world.canonical is required");
        if (typeof snapshot.world.status !== "string" || snapshot.world.status.length === 0) errors.push("world.status is required");
        if (typeof snapshot.world.authority !== "string" || snapshot.world.authority.length === 0) errors.push("world.authority is required");
    }
    errors.push(...findForbiddenKeys(snapshot));
    return { valid: errors.length === 0, errors };
}

function assertValidSnapshot(snapshot, supportedSchemaVersions = [1]) {
    const result = validateSnapshot(snapshot, supportedSchemaVersions);
    if (!result.valid) throw new Error(`Invalid world snapshot: ${result.errors.join("; ")}`);
    return snapshot;
}

module.exports = { FORBIDDEN_KEYS, validateSnapshot, assertValidSnapshot };
