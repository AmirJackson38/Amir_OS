const RUNTIME_MODES = Object.freeze(["legacy", "shadow", "canonical"]);

function resolveRuntimeMode(value = process.env.TARS_RUNTIME_MODE) {
    const mode = value == null || String(value).trim() === "" ? "legacy" : String(value).trim().toLowerCase();
    if (!RUNTIME_MODES.includes(mode)) {
        throw new Error(`Unsupported TARS_RUNTIME_MODE: ${mode}`);
    }
    return mode;
}

class RuntimeModeGuard {
    constructor(mode = resolveRuntimeMode()) {
        this.mode = resolveRuntimeMode(mode);
    }

    getMode() {
        return this.mode;
    }

    isLegacy() {
        return this.mode === "legacy";
    }

    isShadow() {
        return this.mode === "shadow";
    }

    isCanonical() {
        return this.mode === "canonical";
    }

    canMutateCanonicalState() {
        // The shell is not a behavior engine yet. Canonical mode is reserved
        // for the future authority-migration phase and remains write-blocked.
        return false;
    }

    assertCanMutate(operation) {
        throw new Error(`Canonical runtime mutation blocked in ${this.mode} mode: ${operation}`);
    }

    assertNoAuthorityInversion(operation) {
        if (!this.canMutateCanonicalState()) this.assertCanMutate(operation);
    }
}

module.exports = { RUNTIME_MODES, RuntimeModeGuard, resolveRuntimeMode };
