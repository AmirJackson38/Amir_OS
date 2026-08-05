// TARS Phase 9.4 — bounded behavioral memory.
// This module stores summaries derived from runtime events. It never owns or
// mutates worldState, autonomy decisions, or debug telemetry buffers.

const SCHEMA_VERSION = 1;
const STORAGE_PREFIX = "tars_behavioral_memory_v1";
const SLOT_KEYS = [`${STORAGE_PREFIX}_a`, `${STORAGE_PREFIX}_b`];
const MAX_SESSIONS = 90;
const MAX_DAILY_SUMMARIES = 365;
const MAX_ERRORS = 20;
const MAX_BRIDGE_QUEUE = 32;
const CHECKPOINT_MS = 30000;

const clone = (value) => {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
};

const iso = (ms = Date.now()) => new Date(ms).toISOString();

function localTimezone() {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
        return "UTC";
    }
}

function dateKey(ms, timezone) {
    try {
        const parts = new Intl.DateTimeFormat("en-CA", {
            timeZone: timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).formatToParts(new Date(ms));
        const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
        return `${values.year}-${values.month}-${values.day}`;
    } catch {
        return new Date(ms).toISOString().slice(0, 10);
    }
}

function emptyStore() {
    return {
        schemaVersion: SCHEMA_VERSION,
        generation: 0,
        writtenAt: null,
        sessions: {},
        dailySummaries: {},
        health: {
            enabled: true,
            schemaVersion: SCHEMA_VERSION,
            storageAvailable: false,
            activeSession: null,
            lastSuccessfulWrite: null,
            lastDailyRollup: null,
            corruptionDetected: false
        }
    };
}

function validateStore(value) {
    return !!value
        && value.schemaVersion === SCHEMA_VERSION
        && Number.isInteger(value.generation)
        && value.generation >= 0
        && value.sessions && typeof value.sessions === "object"
        && value.dailySummaries && typeof value.dailySummaries === "object";
}

function activityStats(summary, activity) {
    if (!summary.facts.activities[activity]) {
        summary.facts.activities[activity] = {
            started: 0,
            completed: 0,
            interrupted: 0,
            durationSeconds: 0
        };
    }
    return summary.facts.activities[activity];
}

function locationStats(summary, location) {
    if (!summary.facts.locations[location]) {
        summary.facts.locations[location] = {
            visits: 0,
            durationSeconds: 0
        };
    }
    return summary.facts.locations[location];
}

function numericDuration(payload, fallbackMs = 0) {
    const value = payload?.metadata?.duration ?? payload?.duration ?? fallbackMs;
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) return 0;
    return numeric > 1000 ? numeric / 1000 : numeric;
}

export function createBehavioralMemory(options = {}) {
    const storage = options.storage || (typeof window !== "undefined" ? window.localStorage : null);
    const timezone = options.timezone || localTimezone();
    const subscribe = options.subscribe || (typeof window !== "undefined" ? window.subscribeTARSEvent : null);

    let store = emptyStore();
    let activeSessionId = null;
    let currentActivity = null;
    let checkpointTimer = null;
    let bridgeQueue = [];
    let seenEventIds = new Set();
    let attached = false;
    let bridgeListener = null;

    function load() {
        if (!storage) return;
        const candidates = [];
        let corruption = false;
        for (const key of SLOT_KEYS) {
            const raw = (() => {
                try { return storage.getItem(key); } catch { return null; }
            })();
            if (!raw) continue;
            try {
                const parsed = JSON.parse(raw);
                if (validateStore(parsed)) candidates.push(parsed);
                else corruption = true;
            } catch {
                corruption = true;
            }
        }
        if (candidates.length) {
            store = candidates.sort((a, b) => b.generation - a.generation)[0];
        }
        store.health = {
            ...emptyStore().health,
            ...(store.health || {}),
            enabled: true,
            schemaVersion: SCHEMA_VERSION,
            storageAvailable: !!storage,
            corruptionDetected: !!(store.health?.corruptionDetected || corruption),
            activeSession: null
        };
    }

    function health() {
        return {
            ...store.health,
            schemaVersion: SCHEMA_VERSION,
            activeSession: activeSessionId,
            generation: store.generation,
            sessionCount: Object.keys(store.sessions).length,
            dailySummaryCount: Object.keys(store.dailySummaries).length
        };
    }

    function persist() {
        if (!storage) return false;
        const next = clone(store);
        next.schemaVersion = SCHEMA_VERSION;
        next.generation = store.generation + 1;
        next.writtenAt = iso();
        next.health = {
            ...next.health,
            enabled: true,
            schemaVersion: SCHEMA_VERSION,
            storageAvailable: true,
            activeSession: activeSessionId,
            lastSuccessfulWrite: next.writtenAt
        };
        const target = SLOT_KEYS[next.generation % SLOT_KEYS.length];
        try {
            const serialized = JSON.stringify(next);
            storage.setItem(target, serialized);
            const verified = JSON.parse(storage.getItem(target));
            if (!validateStore(verified) || verified.generation !== next.generation) throw new Error("verification failed");
            store = next;
            store.health.storageAvailable = true;
            store.health.lastSuccessfulWrite = next.writtenAt;
            return true;
        } catch (error) {
            store.health.storageAvailable = false;
            if (typeof window !== "undefined" && typeof window.emitTARSEvent === "function") {
                window.emitTARSEvent("error.detected", {
                    context: "behavioral_memory_persist",
                    error: error.message
                }, "tars.behavioral-memory");
            }
            return false;
        }
    }

    function trimStore() {
        const sessionIds = Object.keys(store.sessions).sort((a, b) => {
            return Date.parse(store.sessions[b].updatedAt || store.sessions[b].startedAt || 0)
                - Date.parse(store.sessions[a].updatedAt || store.sessions[a].startedAt || 0);
        });
        for (const id of sessionIds.slice(MAX_SESSIONS)) delete store.sessions[id];

        const dailyIds = Object.keys(store.dailySummaries).sort((a, b) => {
            return Date.parse(store.dailySummaries[b].updatedAt || 0)
                - Date.parse(store.dailySummaries[a].updatedAt || 0);
        });
        for (const id of dailyIds.slice(MAX_DAILY_SUMMARIES)) delete store.dailySummaries[id];
    }

    function mirror(eventType, payload, eventId) {
        const messageSessionId = activeSessionId || payload?.sessionId || null;
        const message = {
            id: eventId || `behavior_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            source: "tars.behavioral",
            type: eventType,
            timestamp: Date.now(),
            data: {
                schemaVersion: SCHEMA_VERSION,
                sessionId: messageSessionId,
                payload: clone(payload)
            },
            domain: "tars",
            priority: "normal"
        };
        const send = typeof window !== "undefined" ? window.TARS_EVENTS?.send : null;
        if (typeof send === "function" && send(message)) return true;
        if (bridgeQueue.length >= MAX_BRIDGE_QUEUE) {
            const healthIndex = bridgeQueue.findIndex(item => item.type === "behavior.memory.health");
            if (eventType === "behavior.memory.health") {
                if (healthIndex >= 0) bridgeQueue.splice(healthIndex, 1);
                else return false;
            } else if (healthIndex >= 0) {
                bridgeQueue.splice(healthIndex, 1);
            } else {
                bridgeQueue.shift();
            }
        }
        bridgeQueue.push(message);
        return false;
    }

    function flushBridge() {
        const send = typeof window !== "undefined" ? window.TARS_EVENTS?.send : null;
        if (typeof send !== "function") return;
        while (bridgeQueue.length) {
            if (!send(bridgeQueue[0])) return;
            bridgeQueue.shift();
        }
    }

    function createSession(context = {}) {
        const now = Date.now();
        const id = context.sessionId || `session_${now}`;
        return {
            memoryId: `session:${id}`,
            memoryClass: "durable",
            retentionClass: "session_archive",
            schemaVersion: SCHEMA_VERSION,
            sessionId: id,
            status: "active",
            startedAt: iso(now),
            endedAt: null,
            updatedAt: iso(now),
            durationSeconds: 0,
            dayKey: dateKey(now, timezone),
            timezone,
            lastEventAt: iso(now),
            facts: {
                activities: {},
                locations: {},
                activitiesCompleted: 0,
                interruptions: 0,
                userInteractionCount: 0,
                userInteractionSeconds: 0,
                weather: { dominantCondition: null, observedConditions: [] },
                errors: []
            },
            startup: {
                coldStart: context.coldStart !== false,
                worldLoaded: !!context.worldLoaded,
                rendererReady: context.rendererReady !== false
            },
            shutdown: { graceful: null, reason: null },
            highlights: [],
            provenance: {
                generator: "tars-behavioral-runtime",
                generatorVersion: "1.0.0",
                generatedAt: iso(now),
                sourceSessionIds: [id],
                sourceMemoryIds: [],
                factPaths: [],
                confidence: 1,
                schemaVersion: SCHEMA_VERSION
            }
        };
    }

    function activeSession() {
        return activeSessionId ? store.sessions[activeSessionId] : null;
    }

    function markExistingSessionsAborted(exceptId) {
        const now = Date.now();
        for (const session of Object.values(store.sessions)) {
            if (session.status !== "active" || session.sessionId === exceptId) continue;
            session.status = "aborted";
            session.endedAt = session.endedAt || iso(now);
            session.updatedAt = iso(now);
            session.shutdown = { graceful: false, reason: "stale_session" };
            session.durationSeconds = Math.max(0, (Date.parse(session.endedAt) - Date.parse(session.startedAt)) / 1000);
            rollup(session);
        }
    }

    function startSession(context = {}) {
        const id = context.sessionId || `session_${Date.now()}`;
        if (activeSessionId === id) return clone(activeSession());
        markExistingSessionsAborted(id);
        const session = createSession({ ...context, sessionId: id });
        store.sessions[id] = session;
        activeSessionId = id;
        store.health.activeSession = id;
        currentActivity = context.activity ? {
            activity: context.activity,
            location: context.location || "unknown",
            startedAt: Date.now()
        } : null;
        trimStore();
        persist();
        mirror("behavior.session.started", session, `session.started:${id}`);
        mirror("behavior.memory.health", health(), `memory.health:${id}:${store.generation}`);
        if (!checkpointTimer) checkpointTimer = setInterval(checkpoint, CHECKPOINT_MS);
        return clone(session);
    }

    function addWeather(session, condition) {
        if (!condition) return;
        const weather = session.facts.weather;
        if (!weather.observedConditions.includes(condition)) weather.observedConditions.push(condition);
        weather.dominantCondition = condition;
    }

    function ingest(event) {
        if (!event || !event.type) return;
        const session = activeSession();
        if (!session) return;
        if (event.id && seenEventIds.has(event.id)) return;
        if (event.id) {
            seenEventIds.add(event.id);
            if (seenEventIds.size > 500) seenEventIds = new Set([...seenEventIds].slice(-250));
        }
        const payload = event.payload || {};
        const now = Date.now();
        session.lastEventAt = iso(now);
        session.updatedAt = iso(now);

        switch (event.type) {
            case "activity.started": {
                const activity = payload.activity || "unknown";
                const location = payload.location || "unknown";
                activityStats(session, activity).started += 1;
                locationStats(session, location).visits += 1;
                currentActivity = { activity, location, startedAt: now };
                mirror("behavior.activity.started", payload, event.id);
                persist();
                break;
            }
            case "activity.completed": {
                const activity = payload.activity || currentActivity?.activity || "unknown";
                const location = payload.location || currentActivity?.location || "unknown";
                const duration = numericDuration(payload, currentActivity ? now - currentActivity.startedAt : 0);
                activityStats(session, activity).completed += 1;
                activityStats(session, activity).durationSeconds += duration;
                locationStats(session, location).durationSeconds += duration;
                session.facts.activitiesCompleted += 1;
                if (activity === "user_interaction") {
                    session.facts.userInteractionCount += 1;
                    session.facts.userInteractionSeconds += duration;
                }
                currentActivity = null;
                mirror("behavior.activity.completed", payload, event.id);
                persist();
                break;
            }
            case "activity.interrupted": {
                const activity = payload.activity || currentActivity?.activity || "unknown";
                activityStats(session, activity).interrupted += 1;
                session.facts.interruptions += 1;
                currentActivity = null;
                mirror("behavior.activity.interrupted", payload, event.id);
                persist();
                break;
            }
            case "world.interaction":
                session.facts.userInteractionCount += 1;
                persist();
                break;
            case "weather.changed":
                addWeather(session, payload.condition || payload.currentCondition || payload.weather?.condition);
                persist();
                break;
            case "world.loaded":
                session.startup.worldLoaded = true;
                mirror("behavior.world.loaded", payload, event.id);
                persist();
                break;
            case "world.saved":
                mirror("behavior.world.saved", payload, event.id);
                persist();
                break;
            case "error.detected": {
                const error = {
                    context: payload.context || "unknown",
                    message: String(payload.error || payload.message || "unknown"),
                    occurredAt: iso(now)
                };
                session.facts.errors.push(error);
                if (session.facts.errors.length > MAX_ERRORS) session.facts.errors.shift();
                mirror("behavior.error.detected", error, event.id);
                persist();
                break;
            }
            default:
                return;
        }
    }

    function rollup(session) {
        const id = `daily:${session.dayKey}:${timezone}`;
        const existing = store.dailySummaries[id] || {
            memoryId: id,
            memoryClass: "durable",
            retentionClass: "daily_durable",
            schemaVersion: SCHEMA_VERSION,
            date: session.dayKey,
            timezone,
            updatedAt: iso(),
            sourceSessionIds: [],
            facts: {
                sessionCount: 0,
                activeSeconds: 0,
                activitiesCompleted: 0,
                activities: {},
                locations: {},
                userInteractionCount: 0,
                userInteractionSeconds: 0,
                weather: { observedConditions: [], dominantCondition: null },
                restartCount: 0,
                errorCount: 0
            },
            highlights: [],
            provenance: {
                generator: "tars-behavioral-rollup",
                generatorVersion: "1.0.0",
                generatedAt: iso(),
                sourceSessionIds: [],
                sourceMemoryIds: [],
                factPaths: [],
                confidence: 1,
                schemaVersion: SCHEMA_VERSION
            }
        };
        if (existing.sourceSessionIds.includes(session.sessionId)) return existing;
        existing.sourceSessionIds.push(session.sessionId);
        existing.facts.sessionCount += 1;
        existing.facts.activeSeconds += session.durationSeconds;
        existing.facts.activitiesCompleted += session.facts.activitiesCompleted;
        existing.facts.userInteractionCount += session.facts.userInteractionCount;
        existing.facts.userInteractionSeconds += session.facts.userInteractionSeconds;
        existing.facts.errorCount += session.facts.errors.length;
        if (session.shutdown.graceful === false) existing.facts.restartCount += 1;

        for (const [activity, values] of Object.entries(session.facts.activities)) {
            const target = existing.facts.activities[activity] || { started: 0, completed: 0, interrupted: 0, durationSeconds: 0 };
            target.started += values.started;
            target.completed += values.completed;
            target.interrupted += values.interrupted;
            target.durationSeconds += values.durationSeconds;
            existing.facts.activities[activity] = target;
        }
        for (const [location, values] of Object.entries(session.facts.locations)) {
            const target = existing.facts.locations[location] || { visits: 0, durationSeconds: 0 };
            target.visits += values.visits;
            target.durationSeconds += values.durationSeconds;
            existing.facts.locations[location] = target;
        }
        for (const condition of session.facts.weather.observedConditions) {
            if (!existing.facts.weather.observedConditions.includes(condition)) existing.facts.weather.observedConditions.push(condition);
        }
        existing.facts.weather.dominantCondition = session.facts.weather.dominantCondition || existing.facts.weather.dominantCondition;
        if (session.facts.activitiesCompleted >= 25) {
            const text = `Completed ${session.facts.activitiesCompleted} activities`;
            if (!existing.highlights.some(h => h.text === text)) {
                existing.highlights.push({
                    type: "milestone",
                    text,
                    provenance: {
                        generator: "tars-behavioral-rollup",
                        generatorVersion: "1.0.0",
                        generatedAt: iso(),
                        sourceSessionIds: [session.sessionId],
                        sourceMemoryIds: [session.memoryId],
                        factPaths: ["facts.activitiesCompleted"],
                        confidence: 1,
                        schemaVersion: SCHEMA_VERSION
                    }
                });
            }
        }
        existing.updatedAt = iso();
        existing.provenance.generatedAt = existing.updatedAt;
        existing.provenance.sourceSessionIds = [...existing.sourceSessionIds];
        store.dailySummaries[id] = existing;
        store.health.lastDailyRollup = existing.updatedAt;
        mirror("behavior.daily.summary", existing, `daily.summary:${id}:${existing.sourceSessionIds.length}`);
        return existing;
    }

    function closeSession(reason = "page_unload", graceful = true) {
        const session = activeSession();
        if (!session) return null;
        if (checkpointTimer) {
            clearInterval(checkpointTimer);
            checkpointTimer = null;
        }
        const now = Date.now();
        session.status = graceful ? "closed" : "aborted";
        session.endedAt = iso(now);
        session.updatedAt = session.endedAt;
        session.lastEventAt = session.endedAt;
        session.durationSeconds = Math.max(0, (now - Date.parse(session.startedAt)) / 1000);
        session.shutdown = { graceful, reason };
        rollup(session);
        activeSessionId = null;
        currentActivity = null;
        store.health.activeSession = null;
        trimStore();
        persist();
        mirror("behavior.session.ended", session, `session.ended:${session.sessionId}:${session.endedAt}`);
        mirror("behavior.session.summary", session, `session.summary:${session.memoryId}:${session.updatedAt}`);
        mirror("behavior.memory.health", health(), `memory.health:closed:${session.sessionId}:${store.generation}`);
        return clone(session);
    }

    function checkpoint() {
        const session = activeSession();
        if (!session) return;
        session.updatedAt = iso();
        session.lastEventAt = session.updatedAt;
        persist();
        mirror("behavior.memory.health", health(), `memory.health:${session.sessionId}:${store.generation}`);
    }

    function attach() {
        if (attached) return;
        attached = true;
        load();
        const topics = [
            "activity.started",
            "activity.completed",
            "activity.interrupted",
            "world.interaction",
            "weather.changed",
            "world.loaded",
            "world.saved",
            "error.detected"
        ];
        if (typeof subscribe === "function") topics.forEach(topic => subscribe(topic, ingest));
        if (typeof document !== "undefined") {
            bridgeListener = () => flushBridge();
            document.addEventListener("tars-events-connected", bridgeListener);
            window.addEventListener("pagehide", () => closeSession("pagehide", false), { once: true });
            window.addEventListener("beforeunload", () => closeSession("beforeunload", true), { once: true });
        }
        setTimeout(flushBridge, 0);
    }

    function inspect({ sessionId = null, date = null } = {}) {
        if (sessionId) return clone(store.sessions[sessionId] || null);
        if (date) {
            const id = `daily:${date}:${timezone}`;
            return clone(store.dailySummaries[id] || null);
        }
        return clone({ sessions: store.sessions, dailySummaries: store.dailySummaries, health: health() });
    }

    function exportData({ sessionId = null, date = null, download = true } = {}) {
        const data = inspect({ sessionId, date });
        if (download && typeof document !== "undefined" && typeof Blob !== "undefined") {
            const label = sessionId || date || "all";
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `tars-behavioral-memory-${label}.json`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(link.href), 0);
        }
        return data;
    }

    load();

    return {
        attach,
        startSession,
        closeSession,
        checkpoint,
        ingest,
        inspect,
        export: exportData,
        getHealth: health,
        getStore: () => clone(store)
    };
}
