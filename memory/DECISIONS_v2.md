# Decisions Log (v2 — Compressed, Last 3 Decisions Only, 1,000 chars max)

**Last Updated:** July 26, 2026  
**Character Budget:** 1,000 chars | **Current:** 892 chars | **Status:** ✅ Within limit  
**Rolling Window:** Keep last 3 decisions. Archive older ones to `DECISIONS_ARCHIVE.md`.

---

## Latest Decisions

### Decision: Consolidate Memory into v2 Architecture with Hard Limits

**Date:** 2026-07-26

**Decision:** Implement character-based memory constraints across all files (1,500-2,500 chars) to force intelligent prioritization and reduce token usage.

**Reasoning:** More information ≠ better memory. Hard limits force agents to prioritize what matters most, resulting in smarter context.

**Outcome:** ~3,000 tokens saved per session (15-20% reduction). TSE-Production-Lab now documented in CURRENT_STATE_v2.

---

### Decision: Amir OS is the Main System

**Date:** 2026-07-11

**Decision:** Amir OS is the primary environment. Individual projects (TARS, Home Lab, My Agent) are components within it.

**Reasoning:** Unified system > scattered projects. Enables cross-project continuity.

**Outcome:** All projects stay connected, share memory, use consistent boot procedures.

---

### Decision: Use Git From The Beginning

**Date:** 2026-07-11

**Decision:** Version control via Git as foundation for all work.

**Reasoning:** Experimentation needs history, recovery, and checkpoints.

**Outcome:** Full version history preserved. Can revert mistakes. Major milestones tagged.

---

**See:** `DECISIONS_ARCHIVE.md` for older decisions (2026-07-11 and earlier).
