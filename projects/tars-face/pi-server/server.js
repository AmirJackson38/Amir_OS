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
            eventBus: eventBus.getStats(),
            services: statusReporter ? statusReporter.getStatus() : [],
            alerts: alertManager ? alertManager.getAlertStats() : {}
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

const wsBridge = new WsBridge(eventBus);
wsBridge.attach(server);

const healthMonitor = new HealthMonitor(eventBus, config.monitoring);
healthMonitor.start();

const statusReporter = new StatusReporter(eventBus);
statusReporter.start();

const alertManager = new AlertManager(eventBus, config.alerts);
alertManager.start();

const dockerMonitor = new DockerMonitor(eventBus, config.monitors?.docker);
dockerMonitor.start();

statusReporter.reportUp("tars.runtime", { version: "0.1.0" });
statusReporter.reportUp("tars.monitor.health", { version: "0.1.0" });
statusReporter.reportUp("tars.wsbridge", { version: "0.1.0" });
statusReporter.reportUp("tars.alert", { version: "0.1.0" });
statusReporter.reportUp("tars.monitor.docker", { version: "0.1.0" });

eventBus.publish({
    id: crypto.randomUUID(),
    source: "tars.runtime",
    type: "system.started",
    timestamp: Date.now(),
    data: { version: "0.1.0", pid: process.pid, uptime: 0, port: PORT },
    domain: "system",
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

    healthMonitor.stop();
    dockerMonitor.stop();
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
