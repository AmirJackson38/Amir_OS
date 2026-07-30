const { execFile } = require("child_process");
const crypto = require("crypto");

class NetworkMonitor {
    constructor(eventBus, options = {}) {
        this.eventBus = eventBus;
        this.hosts = Array.isArray(options.hosts) ? options.hosts : [];
        this.intervalMs = options.intervalMs || 30000;
        this.timeoutMs = options.timeoutMs || 5000;
        this._timer = null;
        this._prevStates = new Map();
    }

    start() {
        if (this.hosts.length === 0) {
            console.log("[Network] No hosts configured — monitor disabled");
            return;
        }
        console.log("[Network] Monitoring " + this.hosts.length + " host(s): " + this.hosts.map(h => h.id).join(", "));
        this._tick();
        this._timer = setInterval(() => this._tick(), this.intervalMs);
    }

    stop() {
        if (this._timer) clearInterval(this._timer);
        this._timer = null;
    }

    async _tick() {
        const results = [];
        for (const host of this.hosts) {
            try {
                const result = await this._pingHost(host.address || host.id);
                results.push({ host: host.id, ...result });
            } catch (e) {
                results.push({ host: host.id, reachable: false, latencyMs: null, error: e.message });
            }
        }

        for (const r of results) {
            this._publishHost(r);
        }
        this._publishSummary(results);
    }

    _pingHost(address) {
        return new Promise((resolve) => {
            const isWin = process.platform === "win32";
            const args = isWin
                ? ["-n", "1", "-w", String(this.timeoutMs), address]
                : ["-c", "1", "-W", "2", address];
            const bin = isWin ? "ping" : "ping";

            const child = execFile(bin, args, { timeout: this.timeoutMs + 1000 }, (err, stdout) => {
                if (err && err.code === "ENOENT") {
                    resolve({ reachable: false, latencyMs: null, error: "ping not found" });
                    return;
                }
                const output = stdout || "";
                let reachable = false;
                let latencyMs = null;

                if (isWin) {
                    const ttlMatch = output.match(/[Tt][Tt][Ll]/);
                    if (ttlMatch) reachable = true;
                    const msMatch = output.match(/[Tt]ime[=<]\s*(\d+)/);
                    if (msMatch) latencyMs = parseInt(msMatch[1]);
                } else {
                    if (output.includes("1 received") || output.includes("1 packets received")) {
                        reachable = true;
                    }
                    const msMatch = output.match(/[Tt]ime[=<]\s*([\d.]+)\s*ms/);
                    if (msMatch) latencyMs = parseFloat(msMatch[1]);
                }

                resolve({ reachable, latencyMs, error: reachable ? null : "unreachable" });
            });

            child.on("error", () => {
                resolve({ reachable: false, latencyMs: null, error: "spawn failed" });
            });
        });
    }

    _publishHost(result) {
        const prev = this._prevStates.get(result.host);
        const justChanged = prev !== undefined && prev !== result.reachable;
        this._prevStates.set(result.host, result.reachable);

        this.eventBus.publish({
            id: crypto.randomUUID(),
            source: "tars.monitor.network",
            type: "infra.network.host",
            timestamp: Date.now(),
            data: {
                host: result.host,
                reachable: result.reachable,
                latencyMs: result.latencyMs,
                status: result.reachable ? "online" : "offline",
                justChanged,
                error: result.error || null
            },
            domain: "infra",
            priority: result.reachable ? "low" : "high"
        });
    }

    _publishSummary(results) {
        const total = results.length;
        const online = results.filter(r => r.reachable).length;
        const offline = total - online;
        const avgLatency = online > 0
            ? Math.round(results.filter(r => r.latencyMs !== null).reduce((s, r) => s + r.latencyMs, 0) / online * 10) / 10
            : null;

        this.eventBus.publish({
            id: crypto.randomUUID(),
            source: "tars.monitor.network",
            type: "infra.network.summary",
            timestamp: Date.now(),
            data: { total, online, offline, avgLatencyMs: avgLatency },
            domain: "infra",
            priority: offline > 0 ? "high" : "low"
        });
    }
}

module.exports = { NetworkMonitor };
