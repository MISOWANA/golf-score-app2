// 전역 CSS 애니메이션 및 기본 스타일
const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;900&display=swap');

  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body { margin: 0; }
  button { font-family: inherit; border: none; cursor: pointer; }
  input { font-family: inherit; }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes holeInOnePulse {
    0%, 100% {
      box-shadow: 0 2px 12px rgba(217, 164, 65, 0.4), 0 0 0 0 rgba(217, 164, 65, 0.6);
    }
    50% {
      box-shadow: 0 2px 16px rgba(217, 164, 65, 0.7), 0 0 0 6px rgba(217, 164, 65, 0);
    }
  }

  @keyframes holeInOneShine {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }

  @keyframes modalFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes modalSlideUp {
    from { opacity: 0; transform: translateY(20px) scale(0.96); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  /* 紐⑤컮??諛섏쓳???ㅽ???*/
  @media (max-width: 430px) {
    * {
      -webkit-text-size-adjust: none !important;
    }
    
    body {
      margin: 0;
      padding: 0;
      overflow-x: hidden;
    }
  }
`;

export default globalCSS;
