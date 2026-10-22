// 스탯·인사이트 맨 위 안내 — 집계에서 빠진 라운드가 있으면 몇 개가 왜 빠졌는지 알려 준다.
//   multiCount  동반자와 함께 기록한 라운드 수 (1인 라운드만 분석)
//   nineCount   9홀 라운드 수 (18홀을 끝낸 라운드만 분석)
export default function ExcludedNote({ multiCount = 0, nineCount = 0, margin = '0 0 12px' }) {
  if (multiCount <= 0 && nineCount <= 0) return null;
  return (
    <div data-role="excluded-note" style={{ margin, padding: '9px 12px', borderRadius: 12, background: 'rgba(136,150,176,0.08)', border: '1px solid #1b2238', fontSize: 14, color: '#8896b0', lineHeight: 1.6, textAlign: 'left' }}>
      {multiCount > 0 && <div data-role="multi-excluded">여러 명이 함께 기록한 라운드 {multiCount}개는 집계에서 제외돼요 (1인 라운드만 분석)</div>}
      {nineCount > 0 && <div data-role="nine-excluded">9홀 라운드 {nineCount}개는 집계에서 제외돼요 (18홀을 끝낸 라운드만 분석)</div>}
    </div>
  );
}
