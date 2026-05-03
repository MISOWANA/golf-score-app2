// Global CSS — LIV Golf Design System
const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;800;900&display=swap');

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
    background: #0b0e18;
    color: #e8edf8;
  }

  button {
    font-family: inherit;
    border: none;
    cursor: pointer;
    background: transparent;
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

  /* Gold accent bar sweep — for premium panel decoration */
  @keyframes goldSweep {
    from { transform: translateX(-100%); }
    to   { transform: translateX(100%); }
  }

  /* ── Mobile optimisations ───────────────────────────────────────────── */
  @media (max-width: 430px) {
    * { -webkit-text-size-adjust: none !important; }
    body { margin: 0; padding: 0; overflow-x: hidden; }
  }
`;

export default globalCSS;
