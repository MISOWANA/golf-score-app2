// 파 대비 색: 언더 초록 · 오버 빨강 · 이븐 회색. 홈의 최근 라운드와 히스토리 카드가 같은 색을 쓴다.
export const TONE = {
  under: { fg: '#0a7f3f', bg: 'rgba(10,127,63,0.12)' },
  over: { fg: '#c8323a', bg: 'rgba(200,50,58,0.12)' },
  even: { fg: '#4e5968', bg: 'rgba(25,31,40,0.072)' },
};

export const scoreTone = (diff) => (diff < 0 ? TONE.under : diff > 0 ? TONE.over : TONE.even);
export const diffLabel = (diff) => (diff > 0 ? `+${diff}` : diff === 0 ? 'E' : `${diff}`);
