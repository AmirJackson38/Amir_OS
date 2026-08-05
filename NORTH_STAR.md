# TARS North Star

## What TARS Is

TARS is a persistent autonomous personal AI system with physical embodiment.

It is part of Amir OS, but it is not merely a chatbot, a UI, a script collection, or a voice assistant. TARS is a world engine: a living local system with runtime services, renderer, memory, telemetry, autonomy, environment interaction, and Raspberry Pi hardware presence.

## Why TARS Exists

TARS exists to become a durable personal AI companion and operations layer that survives sessions, restarts, network loss, model changes, and hardware evolution.

The goal is continuity. TARS should remember its state, explain its behavior, recover from interruptions, and keep functioning even when no LLM or internet connection is available.

## What Separates TARS From Normal Assistants

- TARS has an autonomous world simulation, not only prompt-response behavior.
- TARS has persistent `worldState`, needs, activities, telemetry, and memory boundaries.
- TARS has a browser-based 3D Face and physical Raspberry Pi deployment target.
- TARS must operate offline-first.
- TARS can consult future LLM systems, but the LLM is not the controller.
- TARS behavior should be observable, explainable, and recoverable.

## Long-Term Vision

TARS should become a physically embodied local AI system that can:

- run continuously on dedicated hardware;
- maintain persistent internal and environmental state;
- interact through display, touch, sensors, and future devices;
- explain what version it is, what it is doing, and why;
- support future LLM consultation without surrendering core autonomy;
- grow through modular, testable components instead of fragile rewrites.

## What Future Developers Must Protect

1. **Offline-first autonomy** — the frontend/world simulation must run without LLM, internet, or backend dependency.
2. **World state authority** — `worldState` remains the source of simulated truth.
3. **Physical embodiment** — hardware, display, touch, kiosk, and boot behavior are part of the architecture.
4. **Release integrity** — production baselines are immutable historical snapshots.
5. **Observability** — telemetry, validation, screenshots, health checks, and logs are engineering requirements.
6. **Forward-only evolution** — never rewrite history to make old versions mean new things.
