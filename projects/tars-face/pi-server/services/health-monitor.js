const os = require("os");
const fs = require("fs");
const crypto = require("crypto");
const { execSync } = require("child_process");

class HealthMonitor {
    constructor(eventBus, options = {}) {
        this.eventBus = eventBus;
        this.intervalMs = options.intervalMs || 10000;
        this.cpuWarningThreshold = options.cpuWarningThreshold || 80;
        this.memoryWarningThreshold = options.memoryWarningThreshold || 85;
        this.diskWarningThreshold = options.diskWarningThreshold || 90;
        this.tempWarningC = options.tempWarningC || 75;
        this._timer = null;
        this._prevCpus = os.cpus();
        this.statusReporter = options.statusReporter || null;
    }

    start() {
        this._tick();
        this._timer = setInterval(() => this._tick(), this.intervalMs);
        this.eventBus.publish({
            id: crypto.randomUUID(),
            source: "tars.monitor.health",
            type: "system.started",
            timestamp: Date.now(),
            data: { service: "health-monitor", intervalMs: this.intervalMs },
            domain: "system",
            priority: "low"
        });
    }

    stop() {
        if (this._timer) clearInterval(this._timer);
        this._timer = null;
    }

    _tick() {
        try { this._reportCpu(); } catch (e) { this._publishError("cpu", e); }
        try { this._reportMemory(); } catch (e) { this._publishError("memory", e); }
        try { this._reportDisk(); } catch (e) { this._publishError("disk", e); }
        try { this._reportUptime(); } catch (e) { this._publishError("uptime", e); }
        try { this._reportTemperature(); } catch (e) { this._publishError("temperature", e); }
        if (this.statusReporter) this.statusReporter.reportUp("tars.monitor.health");
    }

    _reportCpu() {
        const cpus = os.cpus();
        const loads = cpus.map((cpu, i) => {
            const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
            const prev = this._prevCpus && this._prevCpus[i];
            let percent = 0;
            if (prev) {
                const prevTotal = Object.values(prev.times).reduce((a, b) => a + b, 0);
                const idleDiff = cpu.times.idle - prev.times.idle;
                const totalDiff = total - prevTotal;
                percent = totalDiff > 0 ? Math.round(((totalDiff - idleDiff) / totalDiff) * 100) : 0;
            }
            return { percent };
        });
        this._prevCpus = cpus;

        const avgPercent = Math.round(loads.reduce((s, l) => s + l.percent, 0) / loads.length);
        const loadAvg = os.loadavg();

        this.eventBus.publish({
            id: crypto.randomUUID(),
            source: "tars.monitor.health",
            type: "health.cpu",
            timestamp: Date.now(),
            data: {
                percent: avgPercent,
                load1: Math.round(loadAvg[0] * 100) / 100,
                load5: Math.round(loadAvg[1] * 100) / 100,
                load15: Math.round(loadAvg[2] * 100) / 100
            },
            domain: "system",
            priority: avgPercent >= this.cpuWarningThreshold ? "high" : "low"
        });
    }

    _reportMemory() {
        const total = os.totalmem();
        const free = os.freemem();
        const used = total - free;
        const percent = Math.round((used / total) * 100);

        this.eventBus.publish({
            id: crypto.randomUUID(),
            source: "tars.monitor.health",
            type: "health.memory",
            timestamp: Date.now(),
            data: {
                totalMb: Math.round(total / 1024 / 1024),
                usedMb: Math.round(used / 1024 / 1024),
                freeMb: Math.round(free / 1024 / 1024),
                percent
            },
            domain: "system",
            priority: percent >= this.memoryWarningThreshold ? "high" : "low"
        });
    }

    _reportDisk() {
        const platform = process.platform;
        let disks = [];

        if (platform === "win32") {
            try {
                const output = execSync("wmic logicaldisk get size,freespace,caption /format:csv", { encoding: "utf8", timeout: 5000 });
                const lines = output.trim().split("\n").slice(1);
                for (const line of lines) {
                    const parts = line.split(",");
                    if (parts.length >= 4) {
                        const device = parts[1].trim();
                        const freeBytes = parseInt(parts[2]) || 0;
                        const totalBytes = parseInt(parts[3]) || 0;
                        if (totalBytes > 0) {
                            const cleanDevice = device.replace(/:$/, "") + ":\\";
                            disks.push({
                                device: cleanDevice,
                                totalGb: Math.round(totalBytes / 1024 / 1024 / 1024 * 10) / 10,
                                usedGb: Math.round((totalBytes - freeBytes) / 1024 / 1024 / 1024 * 10) / 10,
                                freeGb: Math.round(freeBytes / 1024 / 1024 / 1024 * 10) / 10,
                                percent: Math.round((1 - freeBytes / totalBytes) * 100)
                            });
                        }
                    }
                }
            } catch { }
        } else {
            try {
                const output = execSync("df -B1 --exclude-type=tmpfs --exclude-type=devtmpfs 2>/dev/null || df -B1 2>/dev/null", { encoding: "utf8", timeout: 5000 });
                const lines = output.trim().split("\n").slice(1);
                for (const line of lines) {
                    const parts = line.split(/\s+/);
                    if (parts.length >= 6) {
                        const device = parts[0];
                        const totalBytes = parseInt(parts[1]) || 0;
                        const usedBytes = parseInt(parts[2]) || 0;
                        const freeBytes = parseInt(parts[3]) || 0;
                        if (totalBytes > 0) {
                            disks.push({
                                device,
                                totalGb: Math.round(totalBytes / 1024 / 1024 / 1024 * 10) / 10,
                                usedGb: Math.round(usedBytes / 1024 / 1024 / 1024 * 10) / 10,
                                freeGb: Math.round(freeBytes / 1024 / 1024 / 1024 * 10) / 10,
                                percent: Math.round((usedBytes / totalBytes) * 100)
                            });
                        }
                    }
                }
            } catch { }
        }

        for (const disk of disks) {
            this.eventBus.publish({
                id: crypto.randomUUID(),
                source: "tars.monitor.health",
                type: "health.disk",
                timestamp: Date.now(),
                data: disk,
                domain: "system",
                priority: disk.percent >= this.diskWarningThreshold ? "high" : "low"
            });
        }
    }

    _reportUptime() {
        const uptimeSeconds = Math.floor(os.uptime());
        this.eventBus.publish({
            id: crypto.randomUUID(),
            source: "tars.monitor.health",
            type: "health.uptime",
            timestamp: Date.now(),
            data: { uptimeSeconds, bootTime: Date.now() - uptimeSeconds * 1000 },
            domain: "system",
            priority: "low"
        });
    }

    _reportTemperature() {
        let tempC = null;

        if (process.platform === "linux") {
            try {
                const raw = fs.readFileSync("/sys/class/thermal/thermal_zone0/temp", "utf8");
                tempC = parseInt(raw.trim()) / 1000;
            } catch {
                try {
                    const output = execSync("vcgencmd measure_temp", { encoding: "utf8", timeout: 2000 });
                    const match = output.match(/temp=([\d.]+)'C/);
                    if (match) tempC = parseFloat(match[1]);
                } catch { }
            }
        }

        if (tempC !== null) {
            this.eventBus.publish({
                id: crypto.randomUUID(),
                source: "tars.monitor.health",
                type: "health.cpu",
                timestamp: Date.now(),
                data: { tempC },
                domain: "system",
                priority: tempC >= this.tempWarningC ? "high" : "low"
            });
        }
    }

    _publishError(metric, error) {
        this.eventBus.publish({
            id: crypto.randomUUID(),
            source: "tars.monitor.health",
            type: "system.error",
            timestamp: Date.now(),
            data: { message: `health.${metric} failed: ${error.message}`, metric },
            domain: "system",
            priority: "high"
        });
    }
}

module.exports = { HealthMonitor };
