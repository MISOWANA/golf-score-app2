// 휴지통 보관 기간 계산 — 지운 라운드는 7일 보관한다 (db.js 의 trashRound · purgeExpiredTrash).
export const TRASH_KEEP_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

// 보관 기간이 지났는지 (정확히 7일째부터 지난 것으로 본다)
export const isTrashExpired = (deletedAt, now = Date.now()) => now - new Date(deletedAt).getTime() >= TRASH_KEEP_DAYS * DAY_MS;

// 앞으로 며칠 더 보관되는지 (0 이상). 읽을 수 없는 시각이면 보관 기간 전체.
export function trashDaysLeft(deletedAt, now = Date.now()) {
  const t = new Date(deletedAt).getTime();
  if (Number.isNaN(t)) return TRASH_KEEP_DAYS;
  return Math.max(0, TRASH_KEEP_DAYS - Math.floor((now - t) / DAY_MS));
}
