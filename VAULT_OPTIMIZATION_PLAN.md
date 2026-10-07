# Vault Optimization Implementation Plan
**Target:** Amir's Obsidian Vault — Make it accessible, visual, and noob-friendly
**Current State:** Clean Komorebi dashboard (3 blocks), 28 plugins enabled, vault ~17MB

---

## 🎯 High-Level Strategy

**"Spice up, don't rebuild"** — Use existing plugins to add:
- **Visual tables** (spreadsheet-like editing)
- **Buttons/dropdowns** (one-click actions)
- **Properties/frontmatter UI** (no YAML typing)
- **Natural language dates** (type "tomorrow" → `2026-10-07`)
- **Quick capture** (one hotkey → structured note)
- **Daily planning view** (time-blocked schedule)

**Philosophy:** Zero raw YAML editing. Everything via UI. Mobile-friendly.

---

## 📦 Plugin Groups & Implementation Plan

---

### GROUP 1: Core Data & Capture (Enable First)

| Plugin | Purpose | Implementation |
|--------|---------|----------------|
| **Templater** | Smart templates with JS | Create 5 templates: Daily Note, Study Session, Task, Project, Meeting |
| **QuickAdd** | One-click capture | 4 macros: "Log Session", "Add Task", "Capture Idea", "Log Habit" |
| **Natural Language Dates** | Type "friday" → `2026-10-09` | Auto-works in any date field |
| **Buttons** | Clickable actions in notes | Add to Daily Note template: "Start Pomo", "Log Session", "Open Kanban" |

**Deliverable:** Daily Note template with buttons row + 4 QuickAdd macros bound to hotkeys.

---

### GROUP 2: Visual Data Entry (Tables & Properties)

| Plugin | Purpose | Implementation |
|--------|---------|----------------|
| **Pretty Properties** | Sidebar UI for frontmatter | Configure schemas: `study-session`, `task`, `project`, `habit` |
| **Sheet+** | Excel-like table editing | Enable for any Dataview table → inline edit |
| **Table Editor** | Better Markdown tables | Auto-format pipes, sort columns |
| **Meta Bind** | Inline inputs (dropdowns, sliders) | Add to templates: `study_type` dropdown, `focus_rating` slider |

**Deliverable:** Study Session template with Pretty Properties sidebar + Meta Bind dropdown for activity type.

---

### GROUP 3: Task & Project Management

| Plugin | Purpose | Implementation |
|--------|---------|----------------|
| **Tasks** | Query engine for tasks | Global filter `#task`; add due/scheduled/recurring |
| **Task List Kanban** | Visual board | Auto-imports `- [ ] #task` items; drag = update status |
| **Obsidian Day Planner** | Time-block daily view | Calendar pane with time slots; sync with Tasks |

**Deliverable:** 
- Kanban board file per project area (Learning, Projects, Admin)
- Daily Note shows time-blocked plan + task queries (Today, Overdue, This Week)

---

### GROUP 4: Study & Learning Tracking

| Plugin | Purpose | Implementation |
|--------|---------|----------------|
| **Pomodoro Timer** (eatgrass) | Status bar timer + logging | Settings → daily note log format; `[🍅:: N]` on task lines |
| **Heatmap Tracker** | GitHub-style heatmaps | Daily note frontmatter: `study_minutes`, `flashcards_done`; create heatmap note |
| **Flashcards** (if installed) | Spaced repetition | Or use `flashcards_reviewed` in frontmatter for heatmap |

**Deliverable:** 
- Heatmap note in `Trackers/Activity Heatmap.md` (auto-updates)
- Pomodoro logs auto-append to daily notes
- Task lines get `[🍅:: 3]` inline count

---

### GROUP 5: Visual Polish & Navigation

| Plugin | Purpose | Implementation |
|--------|---------|----------------|
| **Colored Tags** | Tag colors in preview | Auto: `#study`=blue, `#task`=orange, `#idea`=green |
| **Callout Manager** | Pretty callout UI | Standardize: `> [!study]`, `> [!task]`, `> [!review]` |
| **Image Converter** | Paste → optimize | Auto-convert to WebP, max 1200px |
| **File Color** | Folder/file colors | Color `02 Projects`=blue, `03 Homelab`=green, `Trackers`=purple |
| **Advanced Canvas** | Visual maps | Canvas for "Learning Map" (nodes = topics, edges = prerequisites) |

---

### GROUP 6: Maintenance & Sync

| Plugin | Purpose | Implementation |
|--------|---------|----------------|
| **Obsidian Git** | Auto-commit | 5-min auto-commit; push on shutdown |
| **Omnisearch** | Global search | Already enabled |
| **Excalidraw** | Hand-drawn diagrams | Canvas for architecture sketches |

---

## 📋 Daily Note Template (Final Form)

```markdown
---
date: {{date}}
study_minutes: 0
flashcards_done: 0
exercise: false
mood: 5
tags: [daily]
---

# {{date:dddd, MMMM D, YYYY}}

> [!plan] **Today's Plan**
> - [ ] One study session (25 min)
> - [ ] Review flashcards
> - [ ] Move one project forward

## ⏰ Time Blocks
```day-planner
date: {{date}}
start: 08:00
end: 22:00
```

## 🎯 Quick Actions
<button name="Start Pomodoro" action="pomodoro:start"></button>
<button name="Log Study Session" action="quickadd:log-session"></button>
<button name="Open Kanban" action="app:open-kanban-learning"></button>

## 📝 Tasks Today
```tasks
not done
due on {{date}}
group by filename
```

## 📚 Study Log (auto)
```dataview
TABLE activity, duration_minutes, topic
FROM "Trackers/Sessions"
WHERE date = date("{{date}}")
SORT started_at DESC
```

## 💡 Captures
<button name="Capture Idea" action="quickadd:capture-idea"></button>
<button name="Log Habit" action="quickadd:log-habit"></button>
```

---

## 🎨 Kanban Board Setup (Per Area)

**File:** `Projects/Kanban Learning.kanban`
- Columns: `Backlog` → `This Week` → `In Progress` → `Review` → `Done`
- Source: `#task #learning` filter

**File:** `Projects/Kanban Projects.kanban`
- Columns: `Ideas` → `Planning` → `Active` → `Blocked` → `Shipped`
- Source: `#task #project` filter

---

## 📊 Heatmap Tracker Config

**Daily Note Frontmatter additions:**
```yaml
study_minutes: 0      # Pomodoro Timer auto-increments
flashcards_done: 0    # Manual or QuickAdd
exercise: false       # Checkbox
```

**Heatmap Note:** `Trackers/Activity Heatmap.md`
```heatmap-tracker
date: date
metrics:
  - study_minutes:
      color: blue
      label: "Study"
  - flashcards_done:
      color: green
      label: "Cards"
  - exercise:
      color: red
      label: "Exercise"
```

---

## ⌨️ Hotkeys to Bind

| Hotkey | Action |
|--------|--------|
| `Ctrl+Shift+S` | QuickAdd: "Log Study Session" |
| `Ctrl+Shift+T` | QuickAdd: "Add Task" |
| `Ctrl+Shift+I` | QuickAdd: "Capture Idea" |
| `Ctrl+Shift+H` | QuickAdd: "Log Habit" |
| `F1` | Open Daily Note |
| `F2` | Open Kanban Learning |
| `F3` | Start Pomodoro |

---

## 🚀 Implementation Order (Another LLM Can Follow)

### Phase 1: Foundation (30 min)
1. Configure **Templater** folder → create 5 templates
2. Configure **QuickAdd** → 4 macros + hotkeys
3. Update **Daily Note** template with buttons + Queries

### Phase 2: Visual Data (30 min)
1. **Pretty Properties** → define 4 schemas
2. **Meta Bind** → add dropdowns to templates
3. **Sheet+** → test inline editing on a Dataview table

### Phase 3: Tasks & Kanban (20 min)
1. **Tasks** → set global filter `#task`, date formats
2. **Task List Kanban** → create 2 boards (Learning, Projects)
3. **Day Planner** → configure time range, link to daily note

### Phase 4: Study Tracking (15 min)
1. **Pomodoro Timer** → daily note log format, task inline field
2. **Heatmap Tracker** → create heatmap note, add frontmatter to daily template

### Phase 5: Polish (15 min)
1. **Colored Tags** → assign colors
2. **Callout Manager** → standard callouts
3. **File Color** → folder colors
4. **Git** → auto-commit interval

---

## ✅ Acceptance Criteria (Noob-Tested)

- [ ] **Zero YAML typing** — all frontmatter via Pretty Properties sidebar
- [ ] **One-click capture** — hotkey → modal → done
- [ ] **Visual task board** — drag card = status change in source file
- [ ] **Time-blocked day** — Daily Note shows schedule + tasks
- [ ] **Heatmap auto-updates** — study minutes appear on graph next day
- [ ] **Buttons work** — "Start Pomo" starts timer, "Log Session" opens modal
- [ ] **Mobile usable** — buttons large, no hover-only actions

---

## 📁 Files to Create/Modify

| File | Action |
|------|--------|
| `08 Templates/Daily Note.md` | Replace with buttonized version |
| `08 Templates/Study Session.md` | Add Pretty Properties + Meta Bind |
| `08 Templates/Task.md` | Add dropdown for priority, due date picker |
| `08 Templates/Project.md` | Add status dropdown, progress slider |
| `Projects/Kanban Learning.kanban` | New board file |
| `Projects/Kanban Projects.kanban` | New board file |
| `Trackers/Activity Heatmap.md` | New heatmap note |
| `.obsidian/plugins/templater-obsidian/templates/` | Templater config |
| `.obsidian/plugins/quickadd/` | QuickAdd macros export |

---

## ⚠️ Guardrails

- **No custom DataviewJS widgets** — use community plugins
- **No raw CSS hacks** — use Style Settings + plugin settings
- **No plugin overlap** — disable `cursor-smith`, `pexels-banner` after testing
- **Test on mobile** — buttons must be thumb-friendly
- **Backup first** — `git commit -am "pre-optimization"` before Phase 1

---

## 📝 Handoff Note for Next LLM

> "Amir is a networking/security student learning via hands-on projects. He wants **visual, clickable, no-YAML** workflows. Current vault has clean Komorebi dashboard. Implement the 5 phases above. Prioritize: Daily Note with buttons → Kanban boards → Heatmap. He uses hotkeys heavily. Keep it simple enough that he can modify templates himself later."