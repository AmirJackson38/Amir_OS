# TARS LLM Intent Prompt Template

When you want TARS to perform a behavior, output a JSON object that TARS.setBehavior() can consume.
Do NOT wrap in markdown code fences — output raw JSON only.

## Schema

```json
{
  "emotion": "idle | listen | think | speak | sarcastic | amused | confused | serious | warning | critical | celebrate | chill | disapproving | excited",
  "intensity": 0.0 - 1.0,
  "energy": 0.0 - 1.0,
  "urgency": 0.0 - 1.0,
  "gaze": "window_left | window_right | desk | rack-a | user",
  "movement": "walk | drift | rush",
  "target": "window_left | window_right | desk | rack-a | user",
  "gesture": "nod | shake | pulse | expand | spin"
}
```

All fields are optional. Only include the fields you want to change.

## Rules

- `gaze` + `target` can be the same value — gaze sets direction, target sets destination
- `movement` only applies when `target` is also set
- `gesture` is a quick micro-animation performed in place
- `intensity` controls emotion strength (0=barely visible, 1=maximum)
- If no fields are set, nothing changes

## Examples

Natural language: "Look at the window, there's a storm coming!"
Output: {"emotion":"think","intensity":0.8,"gaze":"window_right","gesture":"pulse"}

Natural language: "Go check the server rack status"
Output: {"emotion":"listen","gaze":"rack-a","movement":"walk","target":"rack-a"}

Natural language: "Time to write some code at the desk"
Output: {"emotion":"think","energy":0.6,"gaze":"desk"}

Natural language: "Nod if you agree with me"
Output: {"gesture":"nod","emotion":"amused","intensity":0.4}

Natural language: "Relax and watch the view from the left window"
Output: {"emotion":"chill","intensity":0.3,"gaze":"window_left","gesture":"expand"}
