const crypto = require("crypto");

class StatusReporter {
    constructor(eventBus, options = {}) {
        this.eventBus = eventBus;
        this.services = new Map();
        this.heartbeatIntervalMs = options.heartbeatIntervalMs || 30000;
        this.staleThresholdMs = options.staleThresholdMs || 60000;
        this._timer = null;
    }

    start() {
        this._registerSelf();
        this._timer = setInterval(() => this._heartbeat(), this.heartbeatIntervalMs);
        this.eventBus.publish({
            id: crypto.randomUUID(),
            source: "tars.monitor.status",
            type: "system.started",
            timestamp: Date.now(),
            data: { service: "status-reporter", heartbeatIntervalMs: this.heartbeatIntervalMs },
            domain: "system",
            priority: "low"
        });
    }

    stop() {
        if (this._timer) clearInterval(this._timer);
        this._timer = null;
    }

    register(name, metadata = {}) {
        this.services.set(name, {
            name,
            status: "unknown",
            lastSeen: Date.now(),
            ...metadata
        });
    }

    reportUp(name, metadata = {}) {
        const existing = this.services.get(name) || { name };
        this.services.set(name, { ...existing, ...metadata, status: "up", lastSeen: Date.now() });
        this.eventBus.publish({
            id: crypto.randomUUID(),
            source: "tars.monitor.status",
            type: "status.service_up",
            timestamp: Date.now(),
            data: { service: name, ...metadata },
            domain: "system",
            priority: "normal"
        });
    }

    reportDown(name, reason = "") {
        const existing = this.services.get(name) || { name };
        this.services.set(name, { ...existing, status: "down", lastSeen: Date.now() });
        this.eventBus.publish({
            id: crypto.randomUUID(),
            source: "tars.monitor.status",
            type: "status.service_down",
            timestamp: Date.now(),
            data: { service: name, reason, lastSeen: existing.lastSeen },
            domain: "system",
            priority: "high"
        });
    }

    reportDegraded(name, metric, value, threshold) {
        const existing = this.services.get(name) || { name };
        this.services.set(name, { ...existing, status: "degraded", lastSeen: Date.now() });
        this.eventBus.publish({
            id: crypto.randomUUID(),
            source: "tars.monitor.status",
            type: "status.service_degraded",
            timestamp: Date.now(),
            data: { service: name, metric, value, threshold },
            domain: "system",
            priority: "high"
        });
    }

    getStatus() {
        const now = Date.now();
        const result = [];
        for (const [, svc] of this.services) {
            const stale = (now - svc.lastSeen) > this.staleThresholdMs;
            result.push({
                name: svc.name,
                status: stale ? "stale" : svc.status,
                lastSeen: svc.lastSeen,
                ...(svc.version ? { version: svc.version } : {})
            });
        }
        return result;
    }

    _registerSelf() {
        this.services.set("tars.status-reporter", {
            name: "tars.status-reporter",
            status: "up",
            version: "0.1.0",
            lastSeen: Date.now()
        });
    }

    _heartbeat() {
        this._registerSelf();
        this.eventBus.publish({
            id: crypto.randomUUID(),
            source: "tars.monitor.status",
            type: "system.heartbeat",
            timestamp: Date.now(),
            data: {
                uptime: Math.floor(process.uptime()),
                services: this.getStatus()
            },
            domain: "system",
            priority: "low"
        });
    }
}

module.exports = { StatusReporter };
