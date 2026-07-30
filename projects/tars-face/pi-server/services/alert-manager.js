const crypto = require("crypto");

const SEVERITY_ORDER = { info: 0, warning: 1, critical: 2 };

class AlertManager {
    constructor(eventBus, options = {}) {
        this.eventBus = eventBus;
        this.thresholds = options.thresholds || {
            cpuPercent: { warning: 80, critical: 95 },
            memoryPercent: { warning: 85, critical: 95 },
            diskPercent: { warning: 85, critical: 95 },
            tempC: { warning: 70, critical: 80 }
        };
        this.activeAlerts = new Map();
        this.alertHistory = [];
        this.historySize = options.historySize || 200;
        this.dedupWindowMs = options.dedupWindowMs || 300000;
        this._subscriptions = [];
        this._timer = null;
    }

    start() {
        this._subscriptions.push(
            this.eventBus.on("health.cpu", (e) => this._evaluateCpu(e))
        );
        this._subscriptions.push(
            this.eventBus.on("health.memory", (e) => this._evaluateMemory(e))
        );
        this._subscriptions.push(
            this.eventBus.on("health.disk", (e) => this._evaluateDisk(e))
        );
        this._subscriptions.push(
            this.eventBus.on("status.service_down", (e) => this._serviceDown(e))
        );
        this._subscriptions.push(
            this.eventBus.on("status.service_up", (e) => this._serviceUp(e))
        );

        this.eventBus.publish({
            id: crypto.randomUUID(),
            source: "tars.alert",
            type: "system.started",
            timestamp: Date.now(),
            data: { service: "alert-manager" },
            domain: "system",
            priority: "low"
        });
    }

    stop() {
        for (const sub of this._subscriptions) {
            this.eventBus.unsubscribe(sub);
        }
    }

    _createAlert(type, severity, title, message, source, data = {}) {
        const key = type + ":" + source;
        const existing = this.activeAlerts.get(key);
        const now = Date.now();

        if (existing) {
            const sevDelta = SEVERITY_ORDER[severity] - SEVERITY_ORDER[existing.severity];
            if (sevDelta <= 0 && (now - existing.createdAt) < this.dedupWindowMs) {
                existing.lastSeen = now;
                existing.count = (existing.count || 1) + 1;
                if (sevDelta < 0) {
                    existing.severity = severity;
                    existing.title = title;
                    existing.message = message;
                }
                return existing;
            }
            this._resolveAlertByKey(key);
        }

        const alert = {
            id: crypto.randomUUID(),
            type,
            severity,
            title,
            message,
            source,
            status: "created",
            createdAt: now,
            lastSeen: now,
            count: 1,
            data,
            acknowledgedAt: null,
            resolvedAt: null
        };

        this.activeAlerts.set(key, alert);
        this._pushHistory({ ...alert });

        this.eventBus.publish({
            id: crypto.randomUUID(),
            source: "tars.alert",
            type: "alert." + type,
            timestamp: now,
            data: { alert },
            domain: "system",
            priority: severity === "critical" ? "critical" : severity === "warning" ? "high" : "low"
        });

        return alert;
    }

    _resolveAlert(type, source) {
        this._resolveAlertByKey(type + ":" + source);
    }

    _resolveAlertByKey(key) {
        const alert = this.activeAlerts.get(key);
        if (!alert) return;
        alert.status = "resolved";
        alert.resolvedAt = Date.now();
        const copy = { ...alert };
        this.activeAlerts.delete(key);
        this._pushHistory(copy);

        this.eventBus.publish({
            id: crypto.randomUUID(),
            source: "tars.alert",
            type: "alert." + alert.type + ".resolved",
            timestamp: Date.now(),
            data: { alert: copy },
            domain: "system",
            priority: "low"
        });
    }

    _pushHistory(alert) {
        this.alertHistory.push({
            ...alert,
            snapshotAt: Date.now()
        });
        if (this.alertHistory.length > this.historySize) {
            this.alertHistory.shift();
        }
    }

    _evaluateCpu(event) {
        const pct = event.data.percent;
        if (pct === undefined) return;
        if (event.data.tempC !== undefined && event.data.tempC >= this.thresholds.tempC.critical) {
            this._createAlert("system.temp", "critical", "Temperature Critical", event.data.tempC + "°C — throttle risk", "tars.pi.sensor", event.data);
        } else if (event.data.tempC !== undefined && event.data.tempC >= this.thresholds.tempC.warning) {
            this._createAlert("system.temp", "warning", "Temperature High", event.data.tempC + "°C", "tars.pi.sensor", event.data);
        }
        if (pct >= this.thresholds.cpuPercent.critical) {
            this._createAlert("system.cpu", "critical", "CPU Critical", pct + "% load", "tars.monitor.health", event.data);
        } else if (pct >= this.thresholds.cpuPercent.warning) {
            this._createAlert("system.cpu", "warning", "CPU High", pct + "% load", "tars.monitor.health", event.data);
        } else {
            this._resolveAlert("system.cpu", "tars.monitor.health");
            if (event.data.tempC !== undefined && event.data.tempC < this.thresholds.tempC.warning) {
                this._resolveAlert("system.temp", "tars.pi.sensor");
            }
        }
    }

    _evaluateMemory(event) {
        const pct = event.data.percent;
        if (pct === undefined) return;
        if (pct >= this.thresholds.memoryPercent.critical) {
            this._createAlert("system.memory", "critical", "Memory Critical", pct + "% used", "tars.monitor.health", event.data);
        } else if (pct >= this.thresholds.memoryPercent.warning) {
            this._createAlert("system.memory", "warning", "Memory High", pct + "% used", "tars.monitor.health", event.data);
        } else {
            this._resolveAlert("system.memory", "tars.monitor.health");
        }
    }

    _evaluateDisk(event) {
        const pct = event.data.percent;
        if (pct === undefined) return;
        const device = event.data.device || "unknown";
        if (pct >= this.thresholds.diskPercent.critical) {
            this._createAlert("system.disk", "critical", "Disk Critical", pct + "% full (" + device + ")", device, event.data);
        } else if (pct >= this.thresholds.diskPercent.warning) {
            this._createAlert("system.disk", "warning", "Disk High", pct + "% full (" + device + ")", device, event.data);
        } else {
            this._resolveAlert("system.disk", device);
        }
    }

    _serviceDown(event) {
        this._createAlert("service.offline", "critical", "Service Offline", event.data.service + " is unreachable", event.data.service, event.data);
    }

    _serviceUp(event) {
        this._resolveAlert("service.offline", event.data.service);
    }

    getActiveAlerts() {
        return Array.from(this.activeAlerts.values());
    }

    getAlertHistory(count) {
        const n = count || 30;
        return this.alertHistory.slice(-n).reverse();
    }

    getAlertStats() {
        const active = this.activeAlerts.size;
        let critical = 0, warning = 0, info = 0;
        for (const a of this.activeAlerts.values()) {
            if (a.severity === "critical") critical++;
            else if (a.severity === "warning") warning++;
            else info++;
        }
        return { active, critical, warning, info, total: this.alertHistory.length };
    }
}

module.exports = { AlertManager };
