// Global CSS — LIV Golf Design System
const globalCSS = `
  *, *::before, *::after {
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  html {
    color-scheme: dark;
  }

  body {
    margin: 0;
    color: #e8edf8;
  }

  button {
    font-family: inherit;
    border: none;
    cursor: pointer;
    background: transparent;
    transition: transform 0.12s ease, filter 0.12s ease;
  }
  /* 모든 버튼에 홈과 같은 누름 피드백 (인라인으로 transform 을 지정한 버튼은 그대로 둔다) */
  button:not(:disabled):active {
    transform: scale(0.985);
    filter: brightness(1.1);
  }

  input, textarea {
    font-family: inherit;
    color-scheme: dark;
  }

  /* Scrollbar — dark themed */
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #252f4a; border-radius: 2px; }

  /* Hide scrollbar for horizontal tab strips */
  .scrollbar-none {
    scrollbar-width: none;
  }
  .scrollbar-none::-webkit-scrollbar {
    display: none;
  }

  /* ── Animations ─────────────────────────────────────────────────────── */

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes fadeInFast {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Gold shimmer for hole-in-one marker */
  @keyframes holeInOneShine {
    0%,100% { background-position: 0% 50%; }
    50%      { background-position: 100% 50%; }
  }

  /* Gold pulse ring — used for exceptional scores */
  @keyframes goldPulse {
    0%,100% {
      box-shadow: 0 2px 12px rgba(201,162,40,0.4), 0 0 0 0 rgba(201,162,40,0.55);
    }
    50% {
      box-shadow: 0 2px 20px rgba(201,162,40,0.7), 0 0 0 8px rgba(201,162,40,0);
    }
  }

  @keyframes modalFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  @keyframes modalSlideUp {
    from { opacity: 0; transform: translateY(24px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  /* 진행 중 라운드 표시등 — 초록 점이 은은하게 퍼지는 링 */
  @keyframes livePulse {
    0%   { box-shadow: 0 0 0 0 rgba(61,184,122,0.55); }
    70%  { box-shadow: 0 0 0 7px rgba(61,184,122,0); }
    100% { box-shadow: 0 0 0 0 rgba(61,184,122,0); }
  }

  /* 눌렀을 때 살짝 눌리는 터치 피드백 (홈의 카드·버튼) */
  .bb-press {
    transition: transform 0.12s ease, filter 0.12s ease;
  }
  .bb-press:active {
    transform: scale(0.985);
    filter: brightness(1.1);
  }

  /* (!) 알림창 본문 — 문단 사이 간격 */
  .bb-note-body p { margin: 0 0 10px; }
  .bb-note-body p:last-child { margin-bottom: 0; }

  /* 온그린 랜딩 휠 — 키보드로 조각을 고를 때 보이는 표시 */
  [data-role="landing-zone"]:focus-visible path { stroke: #f3d36b; stroke-width: 1.5; fill: rgba(243,211,107,0.1); }

  @media (prefers-reduced-motion: reduce) {
    .bb-live-dot { animation: none !important; }
    .bb-press, .bb-press:active { transition: none; transform: none; }
    button, button:not(:disabled):active { transition: none; transform: none; }
  }

  /* Gold accent bar sweep — for premium panel decoration */
  @keyframes goldSweep {
    from { transform: translateX(-100%); }
    to   { transform: translateX(100%); }
  }

  /* ── Wizard step slide animations ──────────────────────────────────── */

  @keyframes wizardSlideRight {
    from { opacity: 0; transform: translateX(48px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  @keyframes wizardSlideLeft {
    from { opacity: 0; transform: translateX(-48px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  @keyframes holeInOnePulse {
    0%, 100% { box-shadow: 0 2px 12px rgba(201,162,40,0.5); }
    50%       { box-shadow: 0 2px 28px rgba(201,162,40,0.9), 0 0 0 6px rgba(201,162,40,0.15); }
  }

  @keyframes albatrossGlow {
    0%, 100% { box-shadow: 0 2px 16px rgba(232,200,78,0.5), 0 0 0 0 rgba(232,200,78,0.35); }
    50%       { box-shadow: 0 2px 28px rgba(232,200,78,0.85), 0 0 0 5px rgba(232,200,78,0.12); }
  }

  @keyframes eagleGlow {
    0%, 100% { box-shadow: 0 2px 10px rgba(201,162,40,0.35), 0 0 0 0 rgba(201,162,40,0.25); }
    50%       { box-shadow: 0 2px 20px rgba(201,162,40,0.65), 0 0 0 4px rgba(201,162,40,0.08); }
  }

  @keyframes birdieGlow {
    0%, 100% { box-shadow: 0 2px 6px rgba(61,184,122,0.25), 0 0 0 0 rgba(61,184,122,0.2); }
    50%       { box-shadow: 0 2px 14px rgba(61,184,122,0.5), 0 0 0 3px rgba(61,184,122,0.06); }
  }

  @keyframes bogeyRed {
    0%, 100% { box-shadow: 0 2px 5px rgba(239,83,80,0.2); }
    50%       { box-shadow: 0 2px 12px rgba(239,83,80,0.4), 0 0 0 2px rgba(239,83,80,0.06); }
  }

  @keyframes doubleRed {
    0%, 100% { box-shadow: 0 2px 8px rgba(239,83,80,0.3); }
    50%       { box-shadow: 0 2px 16px rgba(239,83,80,0.58), 0 0 0 3px rgba(239,83,80,0.08); }
  }

  @keyframes tripleRed {
    0%, 100% { box-shadow: 0 2px 10px rgba(229,57,53,0.4); }
    50%       { box-shadow: 0 2px 20px rgba(229,57,53,0.72), 0 0 0 4px rgba(229,57,53,0.1); }
  }

  @keyframes quadRed {
    0%, 100% { box-shadow: 0 2px 12px rgba(198,40,40,0.5), 0 0 0 0 rgba(198,40,40,0.35); }
    50%       { box-shadow: 0 2px 24px rgba(198,40,40,0.82), 0 0 0 5px rgba(198,40,40,0.12); }
  }

  /* ── Mobile optimisations ───────────────────────────────────────────── */
  @media (max-width: 430px) {
    * { -webkit-text-size-adjust: none !important; }
    body { margin: 0; padding: 0; overflow-x: hidden; }
  }
`;

export default globalCSS;
