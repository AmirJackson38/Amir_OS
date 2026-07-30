const http = require("http");
const crypto = require("crypto");

const KNOWN_CRASH_STATES = new Set(["restarting", "paused"]);
const UNHEALTHY_MARKER = "unhealthy";

class DockerMonitor {
    constructor(eventBus, options = {}) {
        this.eventBus = eventBus;
        this.socketPath = options.socketPath || "/var/run/docker.sock";
        this.intervalMs = options.intervalMs || 15000;
        this.timeoutMs = options.timeoutMs || 5000;
        this._timer = null;
        this._available = false;
        this._lastContainerStates = new Map();
    }

    start() {
        this._checkDocker().then(available => {
            this._available = available;
            if (available) {
                console.log("[Docker] Connected to Docker socket — starting container monitor");
                this._tick();
                this._timer = setInterval(() => this._tick(), this.intervalMs);
            } else {
                console.log("[Docker] Docker socket not available — monitor disabled");
            }
        });
    }

    stop() {
        if (this._timer) clearInterval(this._timer);
        this._timer = null;
    }

    _checkDocker() {
        return new Promise(resolve => {
            const req = http.request(
                { socketPath: this.socketPath, path: "/info", method: "GET", timeout: this.timeoutMs },
                res => { resolve(res.statusCode === 200); }
            );
            req.on("error", () => resolve(false));
            req.on("timeout", () => { req.destroy(); resolve(false); });
            req.end();
        });
    }

    async _tick() {
        try {
            const [info, containers] = await Promise.all([
                this._dockerGet("/info"),
                this._dockerGet("/containers/json?all=true")
            ]);
            this._publishSummary(info, containers);
            this._publishContainers(containers);
        } catch (e) {
            this._publishError(e);
        }
    }

    _dockerGet(path) {
        return new Promise((resolve, reject) => {
            const req = http.request(
                { socketPath: this.socketPath, path, method: "GET", timeout: this.timeoutMs },
                res => {
                    let body = "";
                    res.on("data", chunk => body += chunk);
                    res.on("end", () => {
                        if (res.statusCode === 200) {
                            try { resolve(JSON.parse(body)); }
                            catch (e) { reject(new Error("Invalid JSON from Docker API")); }
                        } else {
                            reject(new Error("Docker API returned " + res.statusCode));
                        }
                    });
                }
            );
            req.on("error", reject);
            req.on("timeout", () => { req.destroy(); reject(new Error("Docker request timed out")); });
            req.end();
        });
    }

    _publishSummary(info, containers) {
        const total = containers.length;
        let running = 0, stopped = 0, crashed = 0, restartCount = 0;

        for (const c of containers) {
            const state = c.State || "";
            if (state === "running") {
                running++;
                restartCount += (c.RestartCount || 0);
            } else if (KNOWN_CRASH_STATES.has(state) || (c.Status && c.Status.includes(UNHEALTHY_MARKER))) {
                crashed++;
            } else {
                stopped++;
            }
            restartCount += (c.RestartCount || 0);
        }

        this.eventBus.publish({
            id: crypto.randomUUID(),
            source: "tars.monitor.docker",
            type: "infra.docker.summary",
            timestamp: Date.now(),
            data: {
                total,
                running,
                stopped,
                crashed,
                restartCount,
                engineVersion: info.ServerVersion || "",
                containersPaused: info.ContainersPaused || 0,
                containersRunning: info.ContainersRunning || 0,
                containersStopped: info.ContainersStopped || 0,
                imagesTotal: info.Images || 0
            },
            domain: "infra",
            priority: crashed > 0 ? "high" : running > 0 ? "low" : "normal"
        });
    }

    _publishContainers(containers) {
        for (const c of containers) {
            const name = (c.Names || [])[0] || c.Id;
            const cleanName = name.startsWith("/") ? name.slice(1) : name;
            const state = c.State || "";
            const status = c.Status || state;
            const isCrashed = KNOWN_CRASH_STATES.has(state) || (status && status.includes(UNHEALTHY_MARKER));

            let uptimeSeconds = 0;
            if (state === "running" && c.Created) {
                uptimeSeconds = Math.floor((Date.now() - new Date(c.Created).getTime()) / 1000);
            }

            const prevState = this._lastContainerStates.get(cleanName);
            const justCrashed = prevState === "running" && isCrashed;
            const justRestored = prevState !== "running" && state === "running";

            this.eventBus.publish({
                id: crypto.randomUUID(),
                source: "tars.monitor.docker",
                type: "infra.docker.container",
                timestamp: Date.now(),
                data: {
                    name: cleanName,
                    containerId: c.Id ? c.Id.slice(0, 12) : "",
                    image: (c.Image || "").split("@")[0],
                    status,
                    state,
                    restartCount: c.RestartCount || 0,
                    uptimeSeconds,
                    created: c.Created || 0,
                    ports: (c.Ports || []).map(p => ({
                        containerPort: p.PrivatePort,
                        hostPort: p.PublicPort,
                        type: p.Type
                    })),
                    justCrashed,
                    justRestored
                },
                domain: "infra",
                priority: isCrashed ? "critical" : state === "running" ? "low" : "normal"
            });

            this._lastContainerStates.set(cleanName, state);
        }

        for (const [name, state] of this._lastContainerStates) {
            if (!containers.some(c => {
                const cn = (c.Names || [])[0] || c.Id;
                return (cn.startsWith("/") ? cn.slice(1) : cn) === name;
            })) {
                this.eventBus.publish({
                    id: crypto.randomUUID(),
                    source: "tars.monitor.docker",
                    type: "infra.docker.container",
                    timestamp: Date.now(),
                    data: {
                        name,
                        containerId: "",
                        image: "",
                        status: "removed",
                        state: "removed",
                        restartCount: 0,
                        uptimeSeconds: 0,
                        created: 0,
                        ports: [],
                        justCrashed: false,
                        justRestored: false
                    },
                    domain: "infra",
                    priority: "low"
                });
                this._lastContainerStates.delete(name);
            }
        }
    }

    _publishError(error) {
        this.eventBus.publish({
            id: crypto.randomUUID(),
            source: "tars.monitor.docker",
            type: "system.error",
            timestamp: Date.now(),
            data: { message: "Docker monitor: " + error.message },
            domain: "system",
            priority: "high"
        });
    }
}

module.exports = { DockerMonitor };
