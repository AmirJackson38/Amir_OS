class RendererRegistry {
    constructor() {
        this.renderers = new Map();
    }

    connect(renderer) {
        if (!renderer || !renderer.connectionId || !renderer.rendererId) {
            throw new TypeError("rendererId and connectionId are required");
        }
        const record = Object.freeze({
            rendererId: renderer.rendererId,
            connectionId: renderer.connectionId,
            connectedAt: renderer.connectedAt || new Date().toISOString(),
            rendererVersion: renderer.rendererVersion || "unknown",
            schemaVersion: renderer.schemaVersion,
            lastWorldVersion: renderer.lastWorldVersion,
            lastRuntimeEpoch: renderer.lastRuntimeEpoch
        });
        this.renderers.set(record.connectionId, record);
        return { ...record };
    }

    disconnect(connectionId) {
        return this.renderers.delete(connectionId);
    }

    get(connectionId) {
        const record = this.renderers.get(connectionId);
        return record ? { ...record } : null;
    }

    list() {
        return [...this.renderers.values()].map(record => ({ ...record }));
    }

    size() {
        return this.renderers.size;
    }
}

module.exports = { RendererRegistry };
