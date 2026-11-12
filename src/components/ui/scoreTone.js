// 파 대비 색: 언더 초록 · 오버 빨강 · 이븐 회색. 홈의 최근 라운드와 히스토리 카드가 같은 색을 쓴다.
export const TONE = {
  under: { fg: '#0a7f3f', bg: 'rgba(10,127,63,0.12)' },
  over: { fg: '#c8323a', bg: 'rgba(200,50,58,0.12)' },
  even: { fg: '#4e5968', bg: 'rgba(25,31,40,0.072)' },
};

export const scoreTone = (diff) => (diff < 0 ? TONE.under : diff > 0 ? TONE.over : TONE.even);
export const diffLabel = (diff) => (diff > 0 ? `+${diff}` : diff === 0 ? 'E' : `${diff}`);

// 스코어 이름 (한글) — 스코어 입력의 큰 숫자 아래 알약과 홀 복기 머리줄이 같은 이름을 쓴다
export const koScoreName = (strokes, par) => {
  if (!strokes) return null;
  if (strokes === 1) return '홀인원';
  const d = strokes - par;
  if (d <= -3) return '알바트로스';
  if (d === -2) return '이글';
  if (d === -1) return '버디';
  if (d === 0) return '파';
  if (d === 1) return '보기';
  if (d === 2) return '더블 보기';
  if (d === 3) return '트리플 보기';
  if (d === 4) return '쿼드러플 보기';
  return `+${d}`;
};

// 스코어 이름 알약 색 — 파 이하 초록 · 오버 빨강 (글자 대비 4.5 이상이 되도록 바탕은 불투명한 옅은 색)
export const koScoreNameTone = (strokes, par) => (strokes - par <= 0 ? { color: '#0a7f3f', bg: '#e6f6ec' } : { color: '#c8323a', bg: '#fdebec' });
