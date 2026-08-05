const { WebSocketServer } = require("ws");
const crypto = require("crypto");

class WsBridge {
    constructor(eventBus, options = {}) {
        this.eventBus = eventBus;
        this.clients = new Set();
        this.port = options.port || null;
        this.server = null;
        this.wss = null;
        this.inboundEventIds = new Set();
    }

    attach(httpServer) {
        this.wss = new WebSocketServer({ server: httpServer });

        this.wss.on("connection", (ws) => {
            const clientId = crypto.randomUUID();
            this.clients.add(ws);
            ws._tarsClientId = clientId;

            ws.send(JSON.stringify({
                id: crypto.randomUUID(),
                source: "tars.wsbridge",
                type: "system.started",
                timestamp: Date.now(),
                data: { version: "0.1.0", clientId },
                domain: "system",
                priority: "normal"
            }));

            ws.on("message", (raw) => {
                let parsed;
                try {
                    parsed = JSON.parse(raw.toString());
                } catch {
                    ws.send(JSON.stringify({
                        id: crypto.randomUUID(),
                        source: "tars.wsbridge",
                        type: "system.error",
                        timestamp: Date.now(),
                        data: { message: "invalid JSON" },
                        domain: "system",
                        priority: "normal"
                    }));
                    return;
                }

                if (parsed.subscribe) {
                    ws._tarsFilter = parsed.subscribe;
                    ws.send(JSON.stringify({
                        id: crypto.randomUUID(),
                        source: "tars.wsbridge",
                        type: "system.started",
                        timestamp: Date.now(),
                        data: { message: `subscribed to: ${parsed.subscribe.join(", ")}` },
                        domain: "system",
                        priority: "normal"
                    }));
                    return;
                }

                if (parsed.unsubscribe) {
                    ws._tarsFilter = null;
                    return;
                }

                if (parsed.source && parsed.type) {
                    const eventId = parsed.id || crypto.randomUUID();
                    if (this.inboundEventIds.has(eventId)) return;
                    this.inboundEventIds.add(eventId);
                    if (this.inboundEventIds.size > 2000) {
                        this.inboundEventIds = new Set([...this.inboundEventIds].slice(-1000));
                    }
                    this.eventBus.publish({
                        ...parsed,
                        id: eventId,
                        timestamp: parsed.timestamp || Date.now()
                    });
                }
            });

            ws.on("close", () => {
                this.clients.delete(ws);
            });

            ws.on("error", () => {
                this.clients.delete(ws);
            });
        });

        const busHandler = (event) => {
            const msg = JSON.stringify(event);
            for (const ws of this.clients) {
                if (ws.readyState === 1) {
                    const filter = ws._tarsFilter;
                    if (filter && !filter.some(t => {
                        if (t === "*") return true;
                        const parts = t.split("*");
                        if (parts.length === 1) return t === event.type;
                        return event.type.startsWith(parts[0]) && event.type.endsWith(parts[1]);
                    })) continue;
                    ws.send(msg);
                }
            }
        };

        this._unsub = this.eventBus.subscribe(null, busHandler);
    }

    close() {
        if (this._unsub) this.eventBus.unsubscribe(this._unsub);
        if (this.wss) this.wss.close();
    }
}

module.exports = { WsBridge };
