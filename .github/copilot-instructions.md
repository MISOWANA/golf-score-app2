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
- Test: `npm test` (vitest, 한 번 실행) · `npm run test:watch`. 테스트는 소스 옆 `*.test.js(x)`, 공용 데이터는 `src/test/fixtures.js`.
  - 엔진 테스트는 node 환경. 화면 테스트(`GolfScoringApp.test.jsx`)는 파일 맨 위 `// @vitest-environment jsdom` + `fake-indexeddb`.
  - `fuzz.test.js` 는 불완전·예전 형식 라운드를 모든 분석 함수에 넣어 예외·NaN·깨진 문구를 잡는다 — 새 분석 함수를 만들면 여기에 한 줄 추가한다.

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
- When changing DB schema (store names, keyPaths, indexes), handle `onupgradeneeded` and migration; `src/db.test.js` runs the real schema on fake-indexeddb — add a case there.
- 미입력 홀(`touched === false`)은 기본값(파·2퍼트·GIR 성공)이라 비율·횟수 지표에서 빼야 한다 (스탯·인사이트·리포트가 같은 숫자를 보이도록). `engine/roundSummary.js`, `metrics.buildRoundMetrics` 참고.
- 라운드는 18홀(`holes` 18개) 또는 9홀(9개, `nine: 'out'|'in'`)이다. 9홀 라운드의 홀 번호는 코스와 상관없이 **항상 1~9** 이고(후반 코스여도 10~18 을 보여 주지 않는다) `nine` 은 어느 코스의 파·이름을 쓰는지만 가른다. 홀 개수·번호는 `engine/nines.js`(`holePlan`, `ninesOf`, `holeNoOf`, `isNineHoleRound`)로 다루고, 새 라운드는 `engine/newRound.js` 의 `createRound` 로 만든다.
- **9홀 라운드는 스탯·인사이트·마이백 실측 거리 집계에서 빠진다** (18홀을 끝낸 1인 라운드만 분석 — `GolfScoringApp` 의 `statRounds`). 제외한 수는 `components/stats/ExcludedNote.jsx` 가 알려 준다. 9홀 기록은 히스토리·홈(배지)·리포트로만 본다. 홈의 평균 스코어도 18홀 라운드만 쓴다. 엔진(`buildScoreSummary` 등)도 9홀이 섞여 와도 평균·베스트가 오염되지 않게 방어한다.
- "18홀 중 9홀만 입력"한 기록(예전엔 나머지를 파로 채운 18홀로 저장)은 `engine/nineConversion.js` 가 9홀 라운드로 바꾼다 — 앱 첫 실행 때 한 번(`db.migrateNineHoleRounds`, 원본은 users 스토어 `backup:migration:partial-18-to-nine` 에 보관, 프로필 삭제 시 함께 지움), 라운드를 끝낼 때(`finishRound`), 백업을 가져올 때(`handleImportData`). 한쪽 9홀 전부 입력(`touched === true`)·반대쪽 전부 미입력인 경우만 바꾼다.
- 그린을 놓친 홀(`engine/greenMiss.js`)은 놓친 방향(`greenMiss`: long/right/short/left)을 선택 입력으로 받는다 (스코어링 필드샷 탭 "놓친 방향"). 인사이트 규칙과 스탯 어프로치 탭의 GREEN MISS 카드(`buildGreenMissStats`)가 같은 값을 쓴다 — 방향 기록이 4번 미만이면 비율 대신 안내만 보인다.
- 글자 크기는 10px 미만으로 쓰지 않는다 (`src/styles/fontSize.test.js`). 좁은 칸의 글자는 `clamp()` 로 폭에 맞추고, 한글은 `word-break: keep-all` 이 전역 기본이다 (`globalCSS.js`). 화면 확대(`user-scalable=no`)는 의도적으로 막아 두었다.
- 라운드 `pars` 는 없을 수 있다(예전 백업). 파 합계는 `players.totalPar(round)` 로 구하고, 화면에 넘기기 전에 `normalizeRound` 를 거친다.
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
