## Active Focus

**Phase 7.4: TARS Observatory Layer** — Stop adding instincts. Build observability so we can answer *why* TARS does things.

---

## Active Projects

1. **TARS Observatory** — Repair activity log, build Developer Observatory (F3 toggle), upgrade telemetry with full score breakdown, add timeline view, design as subscribable subsystem (browser/Pi/phone).
2. **TARS World Engine** — Complete, receiving observability layer. Behavioral tuning on hold until we can see what's happening.

---

## Next Actions

1. Repair activity log: reliable starts, completions, moves, durations
2. Build Developer Observatory panel (F3/Ctrl+Shift+D): live needs, fatigue, scores, intent, runner-up, countdowns
3. Upgrade telemetry: log full score breakdown per decision
4. Add chronological timeline view
5. Design as subsystem — decouple from browser UI so Pi/phone can subscribe

---

## Key Files

- `projects/tars-face/tars_face_v1.html` — Single-file Three.js app
- `skills/*/SKILL.md` — Progressive-load skill modules
- `workflows/*.md` — Structured procedure definitions
- `manifest.json` — Component registry
