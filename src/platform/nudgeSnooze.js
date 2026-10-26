// 홈의 "백업해 두세요" 안내를 며칠 숨기는 기억 — 안내가 닫을 수 없는 경고처럼 계속 떠 있지 않게.
// 사용자마다 따로, 이 기기의 localStorage 에만 둔다 (지워져도 안내가 다시 보일 뿐이다).
export const NUDGE_SNOOZE_DAYS = 3;
const KEY = (userId) => `bb.backupNudgeSnooze.${userId}`;

// 숨김이 끝나는 시각(ms) | null
export function readNudgeSnooze(userId) {
  try {
    const v = Number(localStorage.getItem(KEY(userId)));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch { return null; }
}

// 지금부터 days 일 동안 숨긴다. 숨김이 끝나는 시각을 돌려준다.
export function snoozeNudge(userId, now, days = NUDGE_SNOOZE_DAYS) {
  const until = now + days * 24 * 60 * 60 * 1000;
  try { localStorage.setItem(KEY(userId), String(until)); } catch { /* 기억만 못 할 뿐 */ }
  return until;
}

export const isNudgeSnoozed = (until, now) => until != null && now < until;
