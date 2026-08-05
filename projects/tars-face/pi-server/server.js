const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const { EventBus } = require("./event-bus");
const { WsBridge } = require("./ws-bridge");
const { HealthMonitor } = require("./services/health-monitor");
const { StatusReporter } = require("./services/status-reporter");
const { AlertManager } = require("./services/alert-manager");
const { DockerMonitor } = require("./services/infra/docker-monitor");
const { NetworkMonitor } = require("./services/infra/network-monitor");
const { CanonicalRuntimeShell } = require("./canonical-runtime-shell");
const { ShadowStateObserver } = require("./shadow-state-observer");
const { ComparisonEngine } = require("./comparison-engine");

const ROOT = path.resolve(__dirname, "..");
const CONFIG_PATH = path.resolve(ROOT, "config", "tars-config.json");

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
        }
    } catch (e) {
        console.error("[TARS] Failed to load config:", e.message);
    }
    return {};
}

function deploymentValue(name) {
    const value = process.env[name];
    if (typeof value !== "string") return "unknown";
    const normalized = value.trim();
    return normalized.length > 0 && normalized.length <= 256 ? normalized : "unknown";
}

const deploymentProvenance = Object.freeze({
    gitSha: deploymentValue("TARS_GIT_SHA"),
    imageDigest: deploymentValue("TARS_IMAGE_DIGEST"),
    deployedAt: deploymentValue("TARS_DEPLOYED_AT"),
    validationStatus: deploymentValue("TARS_VALIDATION_STATUS")
});

const config = loadConfig();
const PORT = config.server?.port || 8080;
const HOST = config.server?.host || "0.0.0.0";

const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml"
};

const eventBus = new EventBus(config.eventBus);

// Phase 10.2: bounded, diagnostic-only observation. It never owns or mutates
// worldState, autonomy, persistence, environment, or behavioral memory.
const shadowObserver = new ShadowStateObserver(config.shadow?.observer);
const comparisonEngine = new ComparisonEngine();

// Phase 10.1: infrastructure-only canonical runtime shell. It exposes the
// frozen identity/snapshot/handshake contract but intentionally does not own
// worldState, autonomy, persistence, or behavioral memory yet.
const canonicalRuntime = new CanonicalRuntimeShell({
    runtimeId: config.runtime?.runtimeId,
    mode: config.runtime?.mode || process.env.TARS_RUNTIME_MODE || "legacy",
    schemaVersion: 1,
    provenance: deploymentProvenance,
    shadowObserver
});

// Phase 9.4: bounded, non-authoritative mirror of frontend behavioral
// summaries. The browser remains the source of behavioral memory truth;
// this mirror exists for inspection and operational visibility only.
const behavioralMemoryMirror = {
    sessions: new Map(),
    dailySummaries: new Map(),
    health: {
        enabled: true,
        schemaVersion: 1,
        storageAvailable: false,
        activeSession: null,
        lastSuccessfulWrite: null,
        lastDailyRollup: null,
        corruptionDetected: false,
        lastSeenAt: null,
        mirroredSessions: 0,
        mirroredDailySummaries: 0
    }
};

eventBus.subscribe({ types: ["behavior.*"] }, (event) => {
    const data = event.data || {};
    const payload = data.payload || {};
    if (event.type === "behavior.memory.health") {
        behavioralMemoryMirror.health = {
            ...behavioralMemoryMirror.health,
            ...payload,
            lastSeenAt: new Date(event.timestamp).toISOString()
        };
    }
    if (event.type === "behavior.session.summary" && payload.memoryId) {
        behavioralMemoryMirror.sessions.set(payload.memoryId, payload);
    }
    if (event.type === "behavior.daily.summary" && payload.memoryId) {
        behavioralMemoryMirror.dailySummaries.set(payload.memoryId, payload);
    }
    while (behavioralMemoryMirror.sessions.size > 90) {
        behavioralMemoryMirror.sessions.delete(behavioralMemoryMirror.sessions.keys().next().value);
    }
    while (behavioralMemoryMirror.dailySummaries.size > 365) {
        behavioralMemoryMirror.dailySummaries.delete(behavioralMemoryMirror.dailySummaries.keys().next().value);
    }
    behavioralMemoryMirror.health.mirroredSessions = behavioralMemoryMirror.sessions.size;
    behavioralMemoryMirror.health.mirroredDailySummaries = behavioralMemoryMirror.dailySummaries.size;
});

const MIME_TYPES_KEYS = Object.keys(MIME_TYPES);

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let filePath = path.join(ROOT, url.pathname === "/" ? "tars_face_v1.html" : url.pathname);

    if (url.pathname === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            status: "ok",
            uptime: Math.floor(process.uptime()),
            timestamp: Date.now(),
            deployment: deploymentProvenance,
            eventBus: eventBus.getStats(),
            canonicalRuntime: canonicalRuntime.getHealth(),
            behavioralMemory: behavioralMemoryMirror.health,
            services: statusReporter ? statusReporter.getStatus() : [],
            alerts: alertManager ? alertManager.getAlertStats() : {}
        }));
        return;
    }

    if (url.pathname === "/health.shadow") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(canonicalRuntime.getShadowHealth(comparisonEngine.getHealth().comparisons)));
        return;
    }

    if (url.pathname === "/api/behavioral-memory") {
        const sessionId = url.searchParams.get("sessionId");
        const date = url.searchParams.get("date");
        const sessions = [...behavioralMemoryMirror.sessions.values()]
            .filter(summary => !sessionId || summary.sessionId === sessionId);
        const dailySummaries = [...behavioralMemoryMirror.dailySummaries.values()]
            .filter(summary => !date || summary.date === date);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            schemaVersion: 1,
            authoritative: false,
            health: behavioralMemoryMirror.health,
            sessions,
            dailySummaries
        }));
        return;
    }

    if (url.pathname === "/api/alerts") {
        const count = parseInt(url.searchParams.get("count")) || 20;
        const state = url.searchParams.get("state");
        res.writeHead(200, { "Content-Type": "application/json" });
        if (state === "active") {
            res.end(JSON.stringify(alertManager ? alertManager.getActiveAlerts() : []));
        } else {
            res.end(JSON.stringify(alertManager ? alertManager.getAlertHistory(count) : []));
        }
        return;
    }

    if (url.pathname === "/api/events") {
        const count = parseInt(url.searchParams.get("count")) || 50;
        const typeFilter = url.searchParams.get("type");
        const filter = typeFilter ? { types: [typeFilter] } : null;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(eventBus.getHistory(count, filter)));
        return;
    }

    filePath = path.normalize(filePath);
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === "ENOENT") {
                res.writeHead(404);
                res.end("Not Found");
            } else {
                res.writeHead(500);
                res.end("Internal Server Error");
            }
            return;
        }
        res.writeHead(200, { "Content-Type": contentType });
        res.end(data);
    });
});

const wsBridge = new WsBridge(eventBus, { runtimeShell: canonicalRuntime });
wsBridge.attach(server);

const statusReporter = new StatusReporter(eventBus);
statusReporter.start();

const healthMonitor = new HealthMonitor(eventBus, { ...config.monitoring, statusReporter });
healthMonitor.start();

const alertManager = new AlertManager(eventBus, { ...config.alerts, statusReporter });
alertManager.start();

const dockerMonitor = new DockerMonitor(eventBus, { ...config.monitors?.docker, statusReporter });
dockerMonitor.start();

const networkMonitor = new NetworkMonitor(eventBus, { ...config.monitors?.network, statusReporter });
networkMonitor.start();

statusReporter.reportUp("tars.runtime", { version: "0.1.0" });
statusReporter.reportUp("tars.wsbridge", { version: "0.1.0" });
setInterval(() => statusReporter.reportUp("tars.runtime", { version: "0.1.0" }), 30000);
setInterval(() => statusReporter.reportUp("tars.wsbridge", { version: "0.1.0" }), 30000);

eventBus.publish({
    id: crypto.randomUUID(),
    source: "tars.runtime",
    type: "system.started",
    timestamp: Date.now(),
    data: { version: "0.1.0", pid: process.pid, uptime: 0, port: PORT },
    domain: "system",
    priority: "normal"
});

eventBus.publish({
    id: crypto.randomUUID(),
    source: "tars.runtime",
    type: "runtime.started",
    timestamp: Date.now(),
    data: canonicalRuntime.getIdentity(),
    domain: "tars",
    priority: "normal"
});

server.listen(PORT, HOST, () => {
    console.log(`[TARS] Server running at http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
    console.log(`[TARS] WebSocket at ws://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}/ws`);
    console.log(`[TARS] Health endpoint: http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}/health`);
    console.log(`[TARS] Event history: http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}/api/events`);
});

function shutdown(signal) {
    console.log(`\n[TARS] Received ${signal}. Shutting down...`);
    eventBus.publish({
        id: crypto.randomUUID(),
        source: "tars.runtime",
        type: "system.stopping",
        timestamp: Date.now(),
        data: { reason: signal, uptime: Math.floor(process.uptime()) },
        domain: "system",
        priority: "normal"
    });

    eventBus.publish({
        id: crypto.randomUUID(),
        source: "tars.runtime",
        type: "runtime.stopped",
        timestamp: Date.now(),
        data: { ...canonicalRuntime.getIdentity(), reason: signal },
        domain: "tars",
        priority: "normal"
    });

    healthMonitor.stop();
    dockerMonitor.stop();
    networkMonitor.stop();
    alertManager.stop();
    statusReporter.stop();
    wsBridge.close();
    server.close(() => {
        console.log("[TARS] Server stopped.");
        process.exit(0);
    });

    setTimeout(() => {
        console.error("[TARS] Forced shutdown after timeout.");
        process.exit(1);
    }, 5000);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("uncaughtException", (err) => {
    console.error("[TARS] Uncaught exception:", err);
    eventBus.publish({
        id: crypto.randomUUID(),
        source: "tars.runtime",
        type: "system.error",
        timestamp: Date.now(),
        data: { message: err.message, stack: err.stack },
        domain: "system",
        priority: "critical"
    });
});
