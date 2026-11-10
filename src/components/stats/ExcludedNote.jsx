// 스탯·인사이트 맨 위 안내 — 집계에서 빠진 라운드가 있으면 몇 개가 왜 빠졌는지 알려 준다.
//   multiCount  동반자와 함께 기록한 라운드 수 (1인 라운드만 분석)
//   nineCount   9홀 라운드 수 (18홀을 끝낸 라운드만 분석)
// 탭마다 맨 위에 반복되므로 상자 없이 한 줄 안팎의 작은 글씨로 — 본문이 화면 아래로 밀리지 않게.
export default function ExcludedNote({ multiCount = 0, nineCount = 0, margin = '0 0 10px' }) {
  if (multiCount <= 0 && nineCount <= 0) return null;
  return (
    <div data-role="excluded-note" style={{ margin, padding: '0 2px', fontSize: 13, color: '#4e5968', lineHeight: 1.5, textAlign: 'left' }}>
      {multiCount > 0 && <div data-role="multi-excluded">여러 명이 함께 기록한 라운드 {multiCount}개는 집계에서 제외돼요 (1인 라운드만 분석)</div>}
      {nineCount > 0 && <div data-role="nine-excluded">9홀 라운드 {nineCount}개는 집계에서 제외돼요</div>}
    </div>
  );
}
