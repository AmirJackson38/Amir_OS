const DEFAULT_LIMITS = Object.freeze({ maxEvents: 100, maxDecisions: 50 });

function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
}

function nowIso(clock) {
    return new Date(clock()).toISOString();
}

function createInitialState(clock) {
    const now = clock();
    return {
        projectedState: {
            activity: {
                current: "idle",
                location: "spawn",
                startedAt: now,
                expectedEndAt: null,
                reason: "initialization",
                previousActivity: null
            },
            environment: { weather: null, timeOfDay: null },
            needs: {},
            world: { lastLoadedFrom: null, lastSavedAt: null, isLoaded: false }
        },
        derivedMetrics: {
            decisionsCount: 0,
            totalConfidence: 0,
            averageConfidence: 0,
            interruptionCount: 0,
            completedCount: 0,
            saveCount: 0,
            errorCount: 0,
            lastUpdatedISO: new Date(now).toISOString(),
            lastUpdatedMs: now,
            interactionsCount: 0,
            collisionCount: 0,
            impulseCount: 0,
            totalInteractionImpulse: 0
        },
        lastWorldInteraction: null,
        latestDecision: null,
        rawEvents: [],
        recentDecisions: []
    };
}

function normalizeLimits(limits = {}) {
    const maxEvents = Number.isInteger(limits.maxEvents) && limits.maxEvents > 0
        ? limits.maxEvents : DEFAULT_LIMITS.maxEvents;
    const maxDecisions = Number.isInteger(limits.maxDecisions) && limits.maxDecisions > 0
        ? limits.maxDecisions : DEFAULT_LIMITS.maxDecisions;
    return { maxEvents, maxDecisions };
}

/**
 * Diagnostic-only parallel ObservatoryDataLayer implementation.
 * It accepts normalized observations and has no runtime/global dependencies.
 */
export function createObservatoryDataLayerCandidate(options = {}) {
    const clock = typeof options.clock === "function" ? options.clock : () => Date.now();
    const limits = normalizeLimits(options.limits);
    let state = createInitialState(clock);
    let disposed = false;

    function updateFreshness(now) {
        state.derivedMetrics.lastUpdatedMs = now;
        state.derivedMetrics.lastUpdatedISO = new Date(now).toISOString();
    }

    function ingest(observation) {
        if (disposed || !observation || typeof observation !== "object") return false;
        const event = observation.event;
        if (!event || typeof event !== "object" || typeof event.type !== "string" || !event.type) return false;
        if (observation.source && observation.source !== "frontend") return false;

        const copiedEvent = clone(event);
        state.rawEvents.push(copiedEvent);
        if (state.rawEvents.length > limits.maxEvents) state.rawEvents.shift();

        const payload = copiedEvent.payload && typeof copiedEvent.payload === "object"
            ? copiedEvent.payload : {};
        const now = clock();

        switch (copiedEvent.type) {
            case "activity.started":
                state.projectedState.activity.current = payload.activity || "idle";
                state.projectedState.activity.location = payload.location || "—";
                state.projectedState.activity.startedAt = now;
                state.projectedState.activity.expectedEndAt = payload.activityEndsAt || null;
                state.projectedState.activity.reason = payload.reason || "started";
                break;
            case "activity.completed":
                state.derivedMetrics.completedCount += 1;
                state.projectedState.activity.previousActivity = {
                    activity: payload.activity,
                    location: payload.location,
                    duration: payload.duration,
                    endedAt: payload.endedAt || now
                };
                break;
            case "activity.interrupted":
                state.derivedMetrics.interruptionCount += 1;
                state.projectedState.activity.previousActivity = {
                    activity: payload.activity,
                    location: payload.location,
                    duration: payload.duration,
                    endedAt: payload.endedAt || now,
                    interrupted: true
                };
                break;
            case "decision.made":
                state.latestDecision = clone(payload);
                state.recentDecisions.push(clone(payload));
                if (state.recentDecisions.length > limits.maxDecisions) state.recentDecisions.shift();
                state.derivedMetrics.decisionsCount += 1;
                if (typeof payload.confidence === "number") {
                    state.derivedMetrics.totalConfidence += payload.confidence;
                    state.derivedMetrics.averageConfidence = +(
                        state.derivedMetrics.totalConfidence / state.derivedMetrics.decisionsCount
                    ).toFixed(3);
                }
                break;
            case "need.changed":
                if (payload.currentNeeds) state.projectedState.needs = clone(payload.currentNeeds);
                break;
            case "weather.changed":
                state.projectedState.environment.weather = clone(payload);
                break;
            case "world.loaded":
                state.projectedState.world.isLoaded = true;
                state.projectedState.world.lastLoadedFrom = payload.restoredFrom || null;
                break;
            case "world.saved":
                state.derivedMetrics.saveCount += 1;
                state.projectedState.world.lastSavedAt = payload.savedAtISO || nowIso(clock);
                break;
            case "error.detected":
                state.derivedMetrics.errorCount += 1;
                break;
            case "world.interaction":
                state.derivedMetrics.interactionsCount += 1;
                if (typeof payload.impulse === "number") {
                    state.derivedMetrics.totalInteractionImpulse += payload.impulse;
                }
                state.lastWorldInteraction = {
                    objectId: payload.objectId || null,
                    kind: payload.kind || "tap",
                    impulse: payload.impulse ?? 0,
                    position: clone(payload.position || null),
                    applied: !!payload.applied,
                    timestamp: nowIso(clock)
                };
                break;
            case "world.physics.collision":
                state.derivedMetrics.collisionCount += 1;
                break;
            case "world.physics.impulse":
                state.derivedMetrics.impulseCount += 1;
                break;
            default:
                break;
        }

        updateFreshness(now);
        return true;
    }

    function getProjectedState() { return clone(state.projectedState); }
    function getMetrics() { return { ...state.derivedMetrics }; }
    function getLatestDecision() { return clone(state.latestDecision); }
    function getRecentDecisions(count = limits.maxDecisions) {
        return state.recentDecisions.slice(-count).map(clone);
    }
    function getRawEvents(count = limits.maxEvents, category = null) {
        const events = category
            ? state.rawEvents.filter(event => event.category === category)
            : state.rawEvents;
        return events.slice(-count).map(clone);
    }
    function getCurrentActivityDuration() {
        const started = state.projectedState.activity.startedAt;
        if (!started) return 0;
        return Math.max(0, Math.floor((clock() - started) / 1000));
    }
    function getActivityCountdown() {
        const expected = state.projectedState.activity.expectedEndAt;
        if (!expected) return 0;
        return Math.max(0, Math.ceil((expected - clock()) / 1000));
    }
    function getLastWorldInteraction() { return clone(state.lastWorldInteraction); }
    function getWorldInteractionSummary() {
        return {
            interactionsCount: state.derivedMetrics.interactionsCount,
            collisionCount: state.derivedMetrics.collisionCount,
            impulseCount: state.derivedMetrics.impulseCount,
            totalInteractionImpulse: +state.derivedMetrics.totalInteractionImpulse.toFixed(3),
            lastInteraction: getLastWorldInteraction()
        };
    }
    function getHealth() {
        return {
            enabled: !disposed,
            bounded: true,
            rawEvents: state.rawEvents.length,
            maxEvents: limits.maxEvents,
            recentDecisions: state.recentDecisions.length,
            maxDecisions: limits.maxDecisions,
            lastUpdatedISO: state.derivedMetrics.lastUpdatedISO
        };
    }
    function reset() {
        state = createInitialState(clock);
        disposed = false;
    }
    function dispose() { disposed = true; }

    return Object.freeze({
        ingest,
        getProjectedState,
        getMetrics,
        getLatestDecision,
        getRecentDecisions,
        getRawEvents,
        getCurrentActivityDuration,
        getActivityCountdown,
        getLastWorldInteraction,
        getWorldInteractionSummary,
        getHealth,
        reset,
        dispose
    });
}

export const OBSERVATORY_CANDIDATE_SCHEMA_VERSION = 1;
