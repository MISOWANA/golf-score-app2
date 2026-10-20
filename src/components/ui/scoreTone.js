// 파 대비 색: 언더 초록 · 오버 빨강 · 이븐 회색. 홈의 최근 라운드와 히스토리 카드가 같은 색을 쓴다.
export const TONE = {
  under: { fg: '#3db87a', bg: 'rgba(61,184,122,0.12)' },
  over: { fg: '#ef5350', bg: 'rgba(239,83,80,0.12)' },
  even: { fg: '#8896b0', bg: 'rgba(136,150,176,0.12)' },
};

export const scoreTone = (diff) => (diff < 0 ? TONE.under : diff > 0 ? TONE.over : TONE.even);
export const diffLabel = (diff) => (diff > 0 ? `+${diff}` : diff === 0 ? 'E' : `${diff}`);
