// ─── 백업 상태 · 백업 파일 ───────────────────────────────────────────────────────
//
// 기록은 이 기기 브라우저에만 있다(서버 없음). 기기를 바꾸거나 브라우저 데이터를 지우면 사라지므로
// 마지막 백업이 언제인지, 그 뒤 몇 라운드가 쌓였는지를 알려 주고, 일정 기준을 넘으면 백업을 권한다.

export const BACKUP_STALE_ROUNDS = 5;     // 마지막 백업 뒤 이만큼 쌓이면 권한다
export const BACKUP_STALE_DAYS = 30;      // 또는 이만큼 지나면 (그 사이 기록이 있을 때)
export const BACKUP_FORMAT_VERSION = '1.1';
export const BACKUP_MAX_BYTES = 30 * 1024 * 1024;

const DAY = 24 * 60 * 60 * 1000;

// meta: { lastBackupAt, roundCount } | null   roundsNow: 지금 기록된 라운드 수
// level: 'empty'(기록 없음) | 'none'(백업한 적 없음) | 'stale'(백업을 권함) | 'ok'
export function backupStatus(meta, roundsNow, now = Date.now()) {
  if (!roundsNow) return { level: 'empty', daysAgo: null, roundsSince: 0, lastBackupAt: null, roundsNow: 0 };
  const last = meta?.lastBackupAt ? new Date(meta.lastBackupAt).getTime() : NaN;
  if (!Number.isFinite(last)) return { level: 'none', daysAgo: null, roundsSince: roundsNow, lastBackupAt: null, roundsNow };
  const daysAgo = Math.max(0, Math.floor((now - last) / DAY));
  const roundsSince = Math.max(0, roundsNow - (meta.roundCount ?? 0));
  const stale = roundsSince >= BACKUP_STALE_ROUNDS || (daysAgo >= BACKUP_STALE_DAYS && roundsSince > 0);
  return { level: stale ? 'stale' : 'ok', daysAgo, roundsSince, lastBackupAt: meta.lastBackupAt, roundsNow };
}

export function backupMessage(status) {
  switch (status.level) {
    case 'none': return `아직 백업한 적이 없어요 · 기록 ${status.roundsNow}라운드가 이 기기에만 있어요`;
    case 'stale': return `마지막 백업 ${status.daysAgo === 0 ? '오늘' : `${status.daysAgo}일 전`} · 그 뒤 ${status.roundsSince}라운드가 쌓였어요`;
    case 'ok': return `마지막 백업 ${status.daysAgo === 0 ? '오늘' : `${status.daysAgo}일 전`}${status.roundsSince > 0 ? ` · 그 뒤 ${status.roundsSince}라운드` : ''}`;
    default: return '기록이 쌓이면 백업 상태를 알려 드려요';
  }
}

// 내보내기 파일 내용. 들여쓰기 없이 한 줄로 — 들여쓰기가 있으면 파일이 두 배 넘게 커진다.
export function serializeBackup(exported) {
  return JSON.stringify({ app: 'birdie-buddy', ...exported, version: BACKUP_FORMAT_VERSION, roundCount: exported.data?.rounds?.length ?? 0 });
}

export function backupFileName(userName, date = new Date()) {
  const safe = String(userName || 'user').replace(/[\\/:*?"<>|\s]+/g, '_');
  const d = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return `birdie-buddy-${safe}-${d}.json`;
}

// 가져오기 파일 검사 → 데이터. 문제가 있으면 사용자에게 보일 한국어 메시지로 Error 를 던진다.
export function parseBackupFile(text, size = text?.length ?? 0) {
  if (size > BACKUP_MAX_BYTES) throw new Error(`파일이 너무 큽니다 (최대 ${Math.round(BACKUP_MAX_BYTES / 1024 / 1024)}MB)`);
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('백업 파일을 읽을 수 없어요. 앱에서 내보낸 JSON 파일인지 확인해 주세요'); }
  if (!data || typeof data !== 'object' || !data.data || !Array.isArray(data.data.rounds)) throw new Error('유효하지 않은 파일 형식입니다');
  // version 이 없는 예전 파일은 그대로 받는다. 1.x 만 받고, 더 새 형식(2.x…)은 이 앱이 읽을 수 없다.
  if (data.version != null && !/^1(\.|$)/.test(String(data.version))) {
    throw new Error(`이 앱보다 새로운 형식의 백업 파일이에요 (버전 ${data.version}). 앱을 최신 버전으로 갱신한 뒤 다시 시도해 주세요`);
  }
  return data;
}
