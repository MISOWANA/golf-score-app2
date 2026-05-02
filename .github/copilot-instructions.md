# Copilot / AI agent instructions — golf-score-app2

This file gives focused, actionable guidance for an AI coding agent working in this repo.

Big picture
- Single-page React app (Vite) — entry at `src/main.jsx` -> `src/GolfScoringApp.jsx` which holds the canonical app state and routes/views.
- Persistence: client-side IndexedDB via `src/db.js` (stores: `rounds`, `users`, `clubs`). Many db functions auto-call `initDB()` when needed.
- Analysis engine: rule-based insights live in `src/engine/*`. `engine.js` exposes `analyzeRound`, `matchHoleInsightRules`, `toHoleInput`. Metrics are in `metrics.js`. Rules are under `src/engine/rules/` (`holeRules.js`, `roundRules.js`).

Key developer workflows
- Run locally: `npm run dev` (Vite dev server, HMR). In PowerShell use the same command. Open http://localhost:5173.
- Build: `npm run build` -> output in Vite `dist/`.
- Preview production build: `npm run preview`.
- Lint: `npm run lint`.

Project conventions & important patterns
- Single source of truth: `GolfScoringApp.jsx` holds currentUser, rounds, currentRound and orchestrates persistence (calls `saveRound`, `loadRoundsByUser`, `setCurrentUser`). Edit this file when changing app-level flows or data shape.
- Hole + round data model (example): each round has `holes: Array(18)` where a hole looks like:
  - { holeNumber, par, scores: { [playerId]: { strokes, putts, fairway, fairwayHit, gir, girAuto, greenMiss, memo, touched } } }
- UI styling: component styles are JS objects in `src/styles/styles.js` and global CSS is injected with `src/styles/globalCSS.js` (`<style>{globalCSS}</style>` in `GolfScoringApp`). Do not expect CSS modules.
- Scoring UX: `src/components/scoring/ScoringView.jsx` contains scoring heuristics (e.g. `inferStatsFromStrokes`, `calculateGir`) — keep engine/metrics and UI heuristics separate. When changing scoring inference, update ScoringView and consider corresponding tests in `src/engine/metrics.js`.
- IndexedDB behavior: `db.js` manages schema upgrades (DB_VERSION = 2). When changing objectStore keys or indexes, update `onupgradeneeded` and consider migration flows; `importUserData` has destructive vs merge modes.
- Insight rules: rules are data objects (conditions + result templates). `engine.renderInsightText` performs {key} template substitution. Conditions use { field, operator, value } evaluated by `evalCondition` in `engine.js`.

Integration & external dependencies
- No backend/API — all client-side storage and processing.
- Icons: `lucide-react` is used throughout (components import icons from it).
- Vite + React 19 with `@vitejs/plugin-react`.

How to test or iterate quickly
- To experiment with the analysis engine in the browser console (while `npm run dev` is running):
  import('/src/engine/engine.js').then(m => {
    // prepare holeInputs (use engine.toHoleInput on an app hole)
    // example: const result = m.analyzeRound(holeInputs, require('/src/engine/rules/holeRules.js'), require('/src/engine/rules/roundRules.js'))
    // console.log(result)
  });
- To validate persistence changes: run the app, use the UI to create rounds, then inspect IndexedDB -> `GolfScoreDB` in browser devtools. Exports use `exportUserData()` and import expects shape { data: { rounds, clubs } }.

Common pitfalls for code changes
- Keep the holes array length/shape consistent; many metrics assume 18 holes and that each hole has `score` fields populated for players.
- When changing DB schema (store names, keyPaths, indexes), handle `onupgradeneeded` and migration; tests will be manual (IndexedDB) unless you add a harness.
- Rule templates reference computed metrics keys (e.g., `girRatePct`, `avgPuttsStr`) — if you rename metrics, update `engine.js` formatting helpers and all rule files.

Files to open first for most tasks
- App orchestration: `src/GolfScoringApp.jsx`
- Persistence: `src/db.js`
- Engine & rules: `src/engine/engine.js`, `src/engine/metrics.js`, `src/engine/rules/*.js`
- Scoring UI: `src/components/scoring/ScoringView.jsx`
- Styles: `src/styles/styles.js`, `src/styles/globalCSS.js`
- Entry points: `src/main.jsx`, `index.html`, `package.json` (scripts & deps)

If something is missing or ambiguous
- Ask for the intended user-facing behavior (example rounds, desired insight rule). I can add small unit tests (Jest/Vite test runner) for `src/engine/*` or a tiny `scripts/sample-analyze.js` to exercise the engine if you want automated checks.

---
If any section needs more detail (examples of hole objects, a migration plan, or sample engine unit tests), tell me which and I will extend this file.
