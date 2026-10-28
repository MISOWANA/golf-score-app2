// 첫 퍼팅 기본 거리 — 설정에서 정해 두면 퍼팅 탭의 첫 퍼팅 거리가 늘 이 값으로 들어가 있다.
// 미터로 저장한다 (null = 쓰지 않음, 예전처럼 비어 있다). 야드 모드에서는 화면만 피트로 보인다.
// 퍼팅 거리 칸의 범위도 여기서 정해, 스코어 입력과 설정 화면이 같은 범위를 쓴다.
export const PUTT_MIN_M = 0.5;
export const PUTT_MAX_M = 30;
export const PUTT_STEP_M = 0.5;
export const PUTT_START_M = 5;   // 거리 칸을 처음 탭할 때의 출발값 · 설정을 처음 켤 때의 값

// 저장된 값을 검사한다 — 범위 밖이거나 숫자가 아니면 null (쓰지 않음)
export function sanitizeFirstPutt(v) {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < PUTT_MIN_M || v > PUTT_MAX_M) return null;
  return Math.round(v * 100) / 100;
}

// 퍼트 i(0부터)를 처음 만들 때의 거리·조준 거리 — 첫 퍼팅만 기본 거리를 넣고, 나머지는 비워 둔다
export function newPuttDetail(i, firstPutt = null) {
  const d = i === 0 ? sanitizeFirstPutt(firstPutt) : null;
  return { distance: d, aimDistance: d, lie: [] };
}
