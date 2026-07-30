const crypto = require("crypto");

const PRIORITY_LEVELS = { low: 0, normal: 1, high: 2, critical: 3 };
const VALID_DOMAINS = new Set(["tars", "system", "home", "infra", "user"]);

function validateEvent(event) {
    if (!event || typeof event !== "object") return "event must be an object";
    if (!event.id || typeof event.id !== "string") return "event.id required";
    if (!event.source || !/^[a-z][a-z0-9._-]+$/.test(event.source)) return "event.source must match ^[a-z][a-z0-9._-]+$";
    if (!event.type || !/^[a-z][a-z0-9._-]+$/.test(event.type)) return "event.type must match ^[a-z][a-z0-9._-]+$";
    if (!Number.isInteger(event.timestamp) || event.timestamp < 0) return "event.timestamp must be a positive integer";
    if (!event.data || typeof event.data !== "object" || Array.isArray(event.data)) return "event.data must be a non-null object";
    if (event.domain && !VALID_DOMAINS.has(event.domain)) return `event.domain must be one of: ${[...VALID_DOMAINS].join(", ")}`;
    if (event.priority && !PRIORITY_LEVELS.hasOwnProperty(event.priority)) return "event.priority must be low|normal|high|critical";
    return null;
}

function matchWildcard(pattern, value) {
    if (pattern === "*") return true;
    const parts = pattern.split("*");
    if (parts.length === 1) return pattern === value;
    if (parts.length > 2) return false;
    return value.startsWith(parts[0]) && value.endsWith(parts[1]);
}

function matchFilter(filter, event) {
    if (!filter) return true;
    if (filter.types && !filter.types.some(t => matchWildcard(t, event.type))) return false;
    if (filter.sources && !filter.sources.includes(event.source)) return false;
    if (filter.domains && !filter.domains.includes(event.domain || "tars")) return false;
    if (filter.minPriority && (PRIORITY_LEVELS[event.priority || "normal"] < PRIORITY_LEVELS[filter.minPriority])) return false;
    return true;
}

class EventBus {
    constructor(options = {}) {
        this.historySize = options.historySize || 1000;
        this.history = [];
        this.subscribers = new Map();
        this.subIdCounter = 0;
        this.stats = { published: 0, dropped: 0, errors: 0 };
    }

    publish(event) {
        const full = {
            id: event.id || crypto.randomUUID(),
            source: event.source,
            type: event.type,
            timestamp: event.timestamp || Date.now(),
            data: event.data || {},
            domain: event.domain || "tars",
            priority: event.priority || "normal",
            ttl: event.ttl ?? 300
        };

        const error = validateEvent(full);
        if (error) {
            this.stats.dropped++;
            const errEvent = {
                id: crypto.randomUUID(),
                source: "tars.eventbus",
                type: "system.error",
                timestamp: Date.now(),
                data: { message: `invalid event: ${error}`, originalType: event.type, originalSource: event.source },
                domain: "system",
                priority: "high"
            };
            this.history.push(errEvent);
            if (this.history.length > this.historySize) this.history.shift();
            for (const sub of this.subscribers.values()) {
                try {
                    if (matchFilter(sub.filter, errEvent)) sub.handler(errEvent);
                } catch (e) {
                    this.stats.errors++;
                }
            }
            return;
        }

        this.stats.published++;
        this.history.push(full);
        if (this.history.length > this.historySize) this.history.shift();

        for (const sub of this.subscribers.values()) {
            try {
                if (matchFilter(sub.filter, full)) sub.handler(full);
            } catch (e) {
                this.stats.errors++;
                const errorEvent = {
                    id: crypto.randomUUID(),
                    source: "tars.eventbus",
                    type: "system.error",
                    timestamp: Date.now(),
                    data: { message: e.message || "subscriber error", subscriberId: sub.id },
                    domain: "system",
                    priority: "high"
                };
                this.history.push(errorEvent);
                if (this.history.length > this.historySize) this.history.shift();
            }
        }
    }

    on(type, handler) {
        return this.subscribe({ types: [type] }, handler);
    }

    once(type, handler) {
        const sub = this.subscribe({ types: [type] }, (event) => {
            handler(event);
            this.unsubscribe(sub);
        });
        return sub;
    }

    subscribe(filter, handler) {
        const id = ++this.subIdCounter;
        const sub = { id, filter, handler };
        this.subscribers.set(id, sub);
        return sub;
    }

    unsubscribe(sub) {
        if (typeof sub === "number") this.subscribers.delete(sub);
        else this.subscribers.delete(sub.id);
    }

    getHistory(count = 10, filter) {
        const slice = this.history.slice(-count);
        if (!filter) return slice;
        return slice.filter(e => matchFilter(filter, e));
    }

    getSubscriberCount() {
        return this.subscribers.size;
    }

    getStats() {
        return { ...this.stats, subscriberCount: this.subscribers.size, historySize: this.history.length };
    }

    clearHistory() {
        this.history = [];
    }
}

module.exports = { EventBus, validateEvent, matchFilter, matchWildcard };
