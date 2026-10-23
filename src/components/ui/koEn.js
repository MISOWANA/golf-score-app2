// "영문 · 한글" 한 줄로 쓰던 제목을 한글 / 영문 두 줄로 나눌 때 쓰는 분리 함수.
// 'SCORE BREAKDOWN · 스코어 기준 손실 (파 대비)' → { en: 'SCORE BREAKDOWN', ko: '스코어 기준 손실 (파 대비)' }
// 형식이 다르면 { en: null, ko: 원문 } — 그대로 한 줄로 보여 준다.
export function splitKoEn(text) {
  const m = typeof text === 'string' ? text.match(/^([A-Z][A-Z0-9 &/'-]*?) · ([\s\S]+)$/) : null;
  return m ? { en: m[1], ko: m[2] } : { en: null, ko: text };
}
