# TARS Cognitive Architecture — Local-First Provider Strategy

## Design Principle
No paid API required. No API keys in code. Every design choice assumes the user may have zero budget and wants TARS running entirely offline or on existing authenticated CLI sessions.

---

## Architecture

```
TARS Face (visual frontend)
    |
TARS Autonomy Engine (scoring, fatigue, scheduling)
    |
TARS Cognitive Router  <── new
    |
    ├── Provider Interface (uniform contract)
    │
    ├── Local LLM Provider (Ollama / llama.cpp)    ← PRIORITY
    ├── CLI Agent Provider (development only)       ← DEV TOOL
    └── API Provider (user-opts-in, never default)  ← OPTIONAL
```

The cognitive router is invoked **after** the existing scoring engine produces candidates. It receives `getTARSContext()` + candidate list + prompt template. It returns a structured decision (activity + rationale + confidence). If the cognitive layer is unavailable, the scoring engine's top choice is used directly.

---

## Provider Interface

Every provider implements the same contract:

```typescript
interface CognitiveProvider {
    name: string;
    type: "local" | "cli" | "api";

    // Health
    isAvailable(): Promise<boolean>;

    // Core inference
    decide(
        context: TARSContextSnapshot,   // from getTARSContext()
        candidates: ActivityCandidate[], // pre-scored options
        options?: DecideOptions
    ): Promise<CognitiveDecision>;

    // Capability metadata
    getCapabilities(): ProviderCapabilities;
}

interface CognitiveDecision {
    selectedActivity: string;
    rationale: string;        // natural language explanation
    confidence: number;       // 0–1
    provider: string;         // which provider made this call
    latencyMs: number;
    modelName?: string;
}

interface ProviderCapabilities {
    maxTokens: number;
    supportsStructuredOutput: boolean;
    supportsStreaming: boolean;
    averageLatencyMs: number;
    requiresNetwork: boolean;
    costPerCall: "$0" | "existing_subscription" | "metered";
}
```

### Provider Interface Contract Rules

1. **Read-only input**: Providers receive a serialized snapshot—never a reference to worldState
2. **Structured output only**: Providers return JSON, never raw text that needs parsing
3. **Bounded time**: Providers must respond within a configurable timeout (default 5s)
4. **Graceful failure**: Provider returns `null` on any error—never throws
5. **No side effects**: Provider cannot modify state, write files, or execute commands

---

## Provider Implementations

### 1. Ollama Provider (RECOMMENDED DEFAULT)

```javascript
class OllamaProvider {
    constructor(model = "llama3.2:3b", endpoint = "http://localhost:11434") {
        this.model = model;
        this.endpoint = endpoint;
    }

    async isAvailable() {
        try {
            const res = await fetch(`${this.endpoint}/api/tags`);
            return res.ok;
        } catch { return false; }
    }

    async decide(context, candidates) {
        const systemPrompt = this.buildSystemPrompt();
        const userPrompt = this.buildUserPrompt(context, candidates);
        const res = await fetch(`${this.endpoint}/api/chat`, {
            method: "POST",
            body: JSON.stringify({
                model: this.model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                format: "json",
                stream: false,
                options: { num_predict: 512, temperature: 0.3 }
            })
        });
        const data = await res.json();
        return this.parseResponse(data);
    }
}
```

**Pros**: Free, offline, standard HTTP API, many model sizes
**Cons**: Requires local hardware, GPU recommended for larger models
**Auth**: None (localhost-only)
**Cost**: $0

#### Recommended models (by hardware):

| Hardware | Model | Quality |
|---|---|---|
| CPU only (8GB RAM) | llama3.2:3b or qwen2.5:3b | Basic reasoning |
| CPU (16GB RAM) | llama3.1:8b or mistral:7b | Good reasoning |
| GPU (6GB+ VRAM) | qwen2.5:14b or llama3:8b | Strong reasoning |
| GPU (24GB+ VRAM) | qwen2.5:32b or llama3.1:70b | Complex reasoning |

### 2. llama.cpp Provider

Same interface as Ollama but uses llama.cpp's built-in server:

```
./llama-server -m model.gguf --port 8080
```

Thinner wrapper—only real difference is the endpoint URL and model name format.

### 3. CLI Provider (DEVELOPMENT ONLY — NOT FOR RUNTIME)

```javascript
class CLIProvider {
    async decide(context, candidates) {
        // Child process — high latency, no concurrency
        const result = execSync(`echo ${JSON.stringify(context)} | ` +
            `claude -p "${systemPrompt}" --output json`, { timeout: 30000 });
        return JSON.parse(result.toString());
    }
}
```

**VERDICT: Development tool only.** Not suitable for runtime because:

| Concern | Why it fails as runtime |
|---|---|
| **Latency** | Each invocation takes 3–15s (process spawn + model load + inference) |
| **Reliability** | CLI tools hang on stdin wait, crash on malformed pipes, produce non-parseable output when they hit rate limits |
| **Authentication** | Session tokens expire; CLI may prompt for login mid-operation, blocking the event loop |
| **Concurrency** | Most CLI tools are single-process; concurrent calls queue or error |
| **Resource waste** | Each call spawns a full process (Python runtime / Node.js + model) |
| **Structured output** | CLI tools optimize for human-readable text; `--output json` flags are inconsistent across tools |

**Valid dev uses:**
- Prompt engineering and iteration
- Testing cognitive layer behavior with real models
- Debugging context quality
- One-shot analyses during development
- Bootstrapping model selection before installing Ollama

### 4. API Provider (OPTIONAL — user opts in)

```javascript
class APIProvider {
    constructor(config) {
        // config.endpoint, config.apiKey from local file, never in code
    }
}
```

**Rules:**
- Never configured by default
- API key stored in `.tars_config.json` (gitignored) or environment variable
- User explicitly enables via TARS Settings panel
- Falls back to local provider if API is unreachable

---

## Authentication Model

| Provider | Auth Method | Key Storage |
|---|---|---|
| Ollama | None (localhost) | None needed |
| llama.cpp | None (localhost) | None needed |
| CLI (dev) | Inherits shell session | ~/.config/claude/credentials (existing) |
| API (optional) | API key / OAuth token | `.tars_config.json` or env var |

**Rule**: Never hardcode credentials. Never commit credentials. Never prompt for credentials in the UI.

---

## Permission Model

The cognitive router operates within a fixed permission boundary:

```
┌─────────────────────────────────────┐
│          Cognitive Router             │
│                                      │
│  Receives: serialized context only   │
│  Outputs:  structured decision only  │
│  Can read: nothing outside snapshot  │
│  Can write: nothing                  │
│  Can exec: nothing                   │
└─────────────────────────────────────┘
```

Three operation modes:

| Mode | Behavior | Use case |
|---|---|---|
| `auto` | LLM decision → executed immediately | Production, trusted model |
| `suggest` | LLM decision → logged, not executed | Validation, testing new models |
| `offline` | LLM skipped → scoring engine only | No provider available |

No mode allows the LLM to execute code, access files, or modify state directly.

---

## Offline Fallback Behavior

```
TARS needs a decision
    │
    ▼
Cognitive Router: check provider health
    │
    ├── Available → provider.decide(context, candidates)
    │                   │
    │                   ├── returns valid → use LLM decision
    │                   └── returns null → fallback to scoring engine
    │
    └── Unavailable → fallback to scoring engine
                          │
                          ▼
                  Log: "cognitive layer unavailable"
                  Use: pre-scored top candidate
                  Autonomy entry: { provider: "fallback", reason: "unavailable" }
```

When the cognitive layer is unavailable:
1. The existing scoring engine (`selectBestActivity()`) runs as-is
2. The decision is logged with `provider: "fallback"` in autonomyHistory
3. TARS continues functioning identically to pre-cognitive-layer behavior
4. A background health check retries the provider every 60s
5. When the provider returns, the cognitive layer resumes automatically

---

## Recommended Provider Strategy

### Default configuration (no setup required)

```
Provider chain: [Ollama → Scoring Engine]
- Try Ollama (http://localhost:11434)
- If unavailable, fall back to scoring engine
- No configuration needed by user
```

### What the user sees

- If Ollama is running: Brain tab shows "Cognitive: Ollama (llama3.2:3b)"
- If Ollama is not running: Brain tab shows "Cognitive: Fallback (scoring engine)"
- No errors, no prompts, no configuration required

### Upgrade path

1. **Default**: No provider → scoring engine only (works today)
2. **Install Ollama**: TARS auto-detects, upgrades to cognitive decisions
3. **Swap model**: User changes model name in Settings
4. **Add CLI (dev)**: Developer enables CLI provider for prompt testing
5. **Add API**: User with existing API key configures optional provider

---

## Security Concerns

| Concern | Mitigation |
|---|---|
| **Prompt injection** | LLM output is parsed as structured JSON only; never eval'd or executed as code |
| **Context leakage** | `getTARSContext()` returns deep copies (implemented in P4); provider cannot mutate worldState |
| **Model poisoning** | Provider runs on localhost only; no network-exposed endpoints |
| **CLI session leak** | CLI provider is dev-only; runtime never uses child_process for inference |
| **API key leak** | Keys stored in gitignored config file or env var; never in source code |
| **Denial of service** | Timeout per provider call (default 5s); provider chain advances on timeout |
| **Model hallucination** | LLM selects from pre-scored candidates only; cannot invent activities. Confidence threshold must be met |

---

## Integration Points (minimal)

| System | Change required |
|---|---|
| TARS Face | None (UI reads autonomyHistory, where provider name is logged) |
| `getTARSContext()` | None (already a read-only snapshot) |
| Memory architecture | None (experienceBuffer, autonomyHistory schemas unchanged) |
| Action system | None (cognitive router outputs activity IDs, same as scoring engine) |
| Scoring engine | None (cognitive router runs after scoring; scoring engine is fallback) |
| Persistence | None (cognitive router is stateless; no new persisted fields) |

**Total integration surface**: Two new files (`cognitive-router.js`, provider files), one call site in `makeAutonomousDecision()`.

---

## Summary

| Question | Answer |
|---|---|
| Default provider | Ollama (auto-detected, zero config) |
| Fallback | Existing scoring engine (no cognitive degradation) |
| CLI agents as runtime? | No — development tools only |
| API keys required? | Never |
| Offline capable? | Yes (Ollama local / scoring engine fallback) |
| User config needed? | Zero to start |
| Security boundary | Read-only context, structured output, no code execution |
