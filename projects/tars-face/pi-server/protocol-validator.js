const SUPPORTED_SCHEMA_VERSIONS = Object.freeze([1]);

function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
}

function isValidRendererId(value) {
    return typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(value);
}

function validateRendererHello(message, supportedVersions = SUPPORTED_SCHEMA_VERSIONS) {
    const errors = [];
    if (!message || typeof message !== "object") errors.push("message must be an object");
    if (message?.type !== "renderer.hello") errors.push("type must be renderer.hello");
    if (!isValidRendererId(message?.rendererId)) errors.push("rendererId must match [a-zA-Z0-9][a-zA-Z0-9._-]{0,63}");
    if (!isNonEmptyString(message?.rendererVersion)) errors.push("rendererVersion is required");
    if (!Array.isArray(message?.supportedSchemaVersions) || !message.supportedSchemaVersions.every(Number.isInteger)) {
        errors.push("supportedSchemaVersions must be an integer array");
    }
    if (!Number.isInteger(message?.lastWorldVersion) || message.lastWorldVersion < 0) errors.push("lastWorldVersion must be a non-negative integer");
    if (!Number.isInteger(message?.lastRuntimeEpoch) || message.lastRuntimeEpoch < 0) errors.push("lastRuntimeEpoch must be a non-negative integer");
    const negotiatedSchemaVersion = message?.supportedSchemaVersions?.find(version => supportedVersions.includes(version));
    return {
        valid: errors.length === 0,
        errors,
        negotiatedSchemaVersion: errors.length === 0 ? negotiatedSchemaVersion || null : null
    };
}

module.exports = { SUPPORTED_SCHEMA_VERSIONS, validateRendererHello, isValidRendererId };
