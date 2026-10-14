// ─── 샷별 벌타 ────────────────────────────────────────────────────────────────
//
// score.penalties = [{ slot, type, mode }]
//   slot : 벌타가 난 샷 (0=티샷, 1=세컨샷, 2 이상=그다음 샷들 — GPS 지점 순서와 같다)
//   type : 'ob' | 'hazard' | 'unplayable'
//   mode : 그다음 샷을 어떻게 쳤는지 (룰 기준 — 모두 아래 벌타 후 '다음 샷'이 실제로 친 샷이다)
//
//   OB (Rule 18.2 · 로컬룰 E-5)
//     'replay'  = 제자리에서 다시 치기 — 스트로크 앤 디스턴스, 1벌타. 다시 친 샷이 3번째 샷
//     'forward' = OB티(티샷) · 앞으로 나가서 2벌타 드롭(그 외 샷) — 2벌타. 다음 샷이 4번째 샷
//   해저드 = 페널티 에어리어 (Rule 17.1d) — 어느 방법이든 1벌타, 다음 샷이 3번째 샷
//     'replay'  = 제자리에서 다시 치기 (직전 샷을 친 자리, 스트로크 앤 디스턴스)
//     'tee'     = 해저드 티(드롭존)에서 치기 (코스 로컬룰)
//     'drop'    = 볼이 경계를 넘은 지점 기준 드롭 — 후방(홀과 일직선 뒤쪽) 또는 측면(레드, 2클럽)
//   언플레이어블 (Rule 19.2) — 어느 방법이든 1벌타, 다음 샷이 3번째 샷
//     'replay'  = 제자리에서 다시 치기 (스트로크 앤 디스턴스)
//     'back'    = 후방 드롭 (볼 자리와 홀을 잇는 선 뒤쪽, 거리 제한 없음)
//     'lateral' = 측면 드롭 (볼 자리 2클럽 이내, 홀에 가깝지 않게)
//
// 위쪽 벌타 칸(score.ob · score.hazard · score.unplayable)은 홀 합계로 그대로 둔다 — 통계·
// 인사이트가 그 값을 쓴다. 어느 샷인지 모르고 합계만 넣은 벌타는 예전 방식(OB는 OB티 기준)
// 으로 계산한다.

export const PENALTY_TYPES = ['ob', 'hazard', 'unplayable'];
export const PENALTY_LABEL = { ob: 'OB', hazard: '해저드', unplayable: '언플레이어블' };

export const penaltyAt = (score, slot) =>
  (score?.penalties || []).find((p) => p.slot === slot) || null;

// 홀 합계 벌타 횟수 (OB + 해저드 + 언플레이어블). '벌타가 있는 홀인지' 판단에 쓴다.
export const penaltyCount = (score) =>
  (score?.ob || 0) + (score?.hazard || 0) + (score?.unplayable || 0);

// 다시 치지 않고 1타로 세는 샷 수 — OB티로 이동한 OB와, 어느 샷인지 모르는 OB.
// (제자리에서 다시 친 OB는 그 샷이 기록되므로 빠진다.)
export function phantomStrokes(score) {
  const ob = score?.ob || 0;
  const replays = (score?.penalties || []).filter((p) => p.type === 'ob' && p.mode === 'replay').length;
  return Math.max(0, ob - replays);
}

// 이 샷의 벌타로 다음 샷 전에 더해지는 타수 (벌타 + 치지 않은 다시 치기)
const strokesAddedAfter = (p) => (!p ? 0 : p.type === 'ob' && p.mode !== 'replay' ? 2 : 1);

// slot번째로 기록된 샷이 실제 몇 타째인지 (샷별로 기록한 벌타 포함)
export function strokeNumberOf(score, slot) {
  let n = 1;
  for (let j = 0; j < slot; j++) n += 1 + strokesAddedAfter(penaltyAt(score, j));
  return n;
}

// 벌타 방법의 짧은 이름 (칩·복기·샷 이름에 붙인다). 방법을 모르는 예전 기록은 null.
export function penaltyModeLabel(p, slot) {
  if (!p) return null;
  if (p.mode === 'replay') return '다시 치기';
  if (p.type === 'ob') return slot === 0 ? 'OB티' : '2벌타 드롭';
  if (p.type === 'hazard') return p.mode === 'tee' ? '해저드 티' : p.mode === 'drop' ? '드롭' : null;
  if (p.type === 'unplayable') return p.mode === 'back' ? '후방 드롭' : p.mode === 'lateral' ? '측면 드롭' : null;
  return null;
}

// 벌타 때문에 다음 샷이 어떻게 시작됐는지 — 샷 이름 뒤에 붙인다.
export function penaltyFollowUp(p, slot) {
  if (!p) return null;
  if (p.mode === 'replay') return slot === 0 ? '다시 친 티샷' : '다시 친 샷';
  return penaltyModeLabel(p, slot) ?? (p.type === 'ob' ? (slot === 0 ? 'OB티' : '2벌타 드롭') : '드롭');
}

// 벌타 샷의 결과 문구 (복기 화면) — 'OB · OB티', '해저드 · 해저드 티', '언플레이어블 · 후방 드롭'
export function penaltyResultText(p, slot) {
  if (!p) return null;
  const head = PENALTY_LABEL[p.type] ?? '벌타';
  const mode = penaltyModeLabel(p, slot) ?? (p.type === 'ob' ? (slot === 0 ? 'OB티' : '2벌타 드롭') : null);
  return mode ? `${head} · ${mode}` : head;
}

const BASE_NAMES = ['티샷', '세컨샷', '써드샷', '포쓰샷', '피프스샷', '식스샷', '세븐샷', '에잇샷', '나인스샷', '텐스샷'];

// 샷 이름. 벌타로 실제 타수가 밀린 샷은 '4번째 샷 · OB티'처럼 실제 타수와 시작 방법을 붙인다.
// 벌타가 없는 흐름은 예전 이름(세컨샷·써드샷…)을 그대로 쓴다.
export function shotTitle(score, slot) {
  if (slot === 0) return '티샷';
  const n = strokeNumberOf(score, slot);
  const why = penaltyFollowUp(penaltyAt(score, slot - 1), slot - 1);
  if (n === slot + 1 && !why) return BASE_NAMES[slot] ?? `${n}번째 샷`;
  return why ? `${n}번째 샷 · ${why}` : `${n}번째 샷`;
}

// 벌타 때문에 샷 이름이 바뀌었는지 (예전 이름 대신 shotTitle을 써야 하는지)
export const titleShifted = (score, slot) =>
  slot > 0 && (strokeNumberOf(score, slot) !== slot + 1 || !!penaltyAt(score, slot - 1));
