// IndexedDB 초기화 및 관리 유틸리티
import { isTrashExpired } from './engine/trash.js';
import { sanitizeGoals } from './engine/goals.js';
import { sanitizePrefs } from './engine/units.js';

const DB_NAME = 'GolfScoreDB';
const DB_VERSION = 2;
const ROUNDS_STORE = 'rounds';
const USERS_STORE = 'users';
const CLUBS_STORE = 'clubs';

let db = null;

export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // rounds store 생성 (userId, createdAt으로 인덱싱)
      if (!database.objectStoreNames.contains(ROUNDS_STORE)) {
        const roundsStore = database.createObjectStore(ROUNDS_STORE, { keyPath: 'id' });
        roundsStore.createIndex('userId', 'userId', { unique: false });
        roundsStore.createIndex('createdAt', 'date', { unique: false });
      }

      // users store 생성 (현재 사용자 정보 저장)
      if (!database.objectStoreNames.contains(USERS_STORE)) {
        database.createObjectStore(USERS_STORE, { keyPath: 'id' });
      }

      // clubs store 생성 (사용자별 클럽 설정)
      if (!database.objectStoreNames.contains(CLUBS_STORE)) {
        const clubsStore = database.createObjectStore(CLUBS_STORE, { keyPath: 'userId' });
        clubsStore.createIndex('userId', 'userId', { unique: true });
      }
    };
  });
};

const ensureDB = async () => { if (!db) await initDB(); };

const asPromise = (request) => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

// 사용자 ID 인자는 한 개(string) 또는 여러 개(array) 모두 받는다.
// 한 사람의 기록이 예전 ID 여러 개에 흩어져 있을 수 있기 때문(아래 프로필 참고).
const toIds = (ids) => (Array.isArray(ids) ? ids : [ids]).filter(Boolean);

// 브라우저가 저장 공간이 부족할 때 이 사이트 데이터를 지우지 않도록 요청한다.
// iOS Safari는 홈 화면에 추가하지 않은 사이트의 저장소를 7일 미사용 시 지울 수
// 있다 — 요청이 거절돼도 앱 동작에는 영향이 없다.
export const requestPersistentStorage = async () => {
  try {
    if (navigator.storage?.persisted && await navigator.storage.persisted()) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
};

// ─── 라운드 ──────────────────────────────────────────────────────────────────

// 사용자별 라운드 로드 (여러 ID면 합쳐서, 같은 라운드는 한 번만)
export const loadRoundsByUser = async (ids) => {
  await ensureDB();
  const index = db.transaction([ROUNDS_STORE], 'readonly').objectStore(ROUNDS_STORE).index('userId');
  const lists = await Promise.all(toIds(ids).map((id) => asPromise(index.getAll(id))));
  const byId = new Map();
  lists.flat().forEach((r) => byId.set(r.id, r));
  return [...byId.values()].sort((a, b) => new Date(b.date) - new Date(a.date));
};

// 라운드 저장
export const saveRound = async (round, userId) => {
  await ensureDB();
  const roundWithUser = {
    ...round,
    userId,
    createdAt: round.createdAt || new Date().toISOString(),
  };
  const store = db.transaction([ROUNDS_STORE], 'readwrite').objectStore(ROUNDS_STORE);
  await asPromise(store.put(roundWithUser));
  return roundWithUser;
};

// 라운드 삭제
export const deleteRound = async (roundId) => {
  await ensureDB();
  const store = db.transaction([ROUNDS_STORE], 'readwrite').objectStore(ROUNDS_STORE);
  await asPromise(store.delete(roundId));
};

// ─── 사용자 프로필 ────────────────────────────────────────────────────────────
//
// 예전에는 로그인할 때마다 새 userId를 만들어서, 로그아웃 후 같은 이름으로 다시
// 들어오면 이전 기록이 보이지 않았다(데이터는 남아 있지만 찾아갈 길이 없음).
// 이제 users 스토어에 이름별 프로필을 두고, 같은 이름이면 같은 프로필로 들어간다.
//
//   { id: 'profile:<userId>', userId, userName, aliases: [예전 userId...], lastUsedAt }
//
// aliases: 예전에 같은 이름으로 만들어진 userId들. 기존 라운드의 userId는 손대지
// 않고, 읽을 때 userId + aliases 전부에서 모은다 — 기존 데이터를 옮기거나 지우지
// 않기 위해서다. 새로 저장하는 기록은 대표 userId로 들어간다.

const PROFILE_PREFIX = 'profile:';
const normName = (name) => (name || '').trim().toLowerCase();

// 한 프로필의 기록이 들어 있을 수 있는 모든 userId
export const userIdsOf = (user) => (user ? [user.userId, ...(user.aliases || [])] : []);

export const listProfiles = async () => {
  await ensureDB();
  const store = db.transaction([USERS_STORE], 'readonly').objectStore(USERS_STORE);
  const all = await asPromise(store.getAll());
  return all
    .filter((r) => typeof r.id === 'string' && r.id.startsWith(PROFILE_PREFIX))
    .sort((a, b) => (b.lastUsedAt || '').localeCompare(a.lastUsedAt || ''));
};

const putProfiles = async (profiles) => {
  if (profiles.length === 0) return;
  await ensureDB();
  const store = db.transaction([USERS_STORE], 'readwrite').objectStore(USERS_STORE);
  await Promise.all(profiles.map((p) => asPromise(store.put({ ...p, id: PROFILE_PREFIX + p.userId }))));
};

// 기존 기록에서 프로필을 만든다 — 앱 시작 시 매번 돌지만, 이미 프로필에 묶인
// userId는 건너뛰므로 두 번째부터는 사실상 아무것도 하지 않는다.
//
// 프로필이 없는 userId(예전 로그인 흔적)는 그 라운드들의 첫 번째 플레이어 이름
// (가장 많이 나온 것)으로 주인을 추정하고, 같은 이름의 프로필이 있으면 그 aliases에
// 붙인다. 같은 이름의 예전 ID가 여럿이면 가장 최근 것이 대표가 된다.
export const migrateProfiles = async () => {
  await ensureDB();
  const tx = db.transaction([USERS_STORE, ROUNDS_STORE], 'readonly');
  const [userRows, rounds] = await Promise.all([
    asPromise(tx.objectStore(USERS_STORE).getAll()),
    asPromise(tx.objectStore(ROUNDS_STORE).getAll()),
  ]);

  const profiles = userRows.filter((r) => typeof r.id === 'string' && r.id.startsWith(PROFILE_PREFIX));
  const known = new Set(profiles.flatMap(userIdsOf));
  const byName = new Map(profiles.map((p) => [normName(p.userName), p]));
  const changed = new Set();

  const attach = (userId, userName, lastUsedAt) => {
    if (!userId || known.has(userId) || !normName(userName)) return;
    known.add(userId);
    const owner = byName.get(normName(userName));
    if (owner) {
      owner.aliases = [...(owner.aliases || []), userId];
      if ((lastUsedAt || '') > (owner.lastUsedAt || '')) owner.lastUsedAt = lastUsedAt;
      changed.add(owner);
      return;
    }
    const p = { userId, userName: userName.trim(), aliases: [], lastUsedAt: lastUsedAt || new Date().toISOString() };
    profiles.push(p);
    byName.set(normName(userName), p);
    changed.add(p);
  };

  // 1) 지금 로그인된 사용자 — 이름이 확실하므로 먼저 대표로 세운다.
  const current = userRows.find((r) => r.id === 'current');
  if (current) attach(current.userId, current.userName, new Date().toISOString());

  // 2) 라운드·진행 중 라운드에만 남은 예전 userId
  const traces = new Map(); // userId → { names: Map(name→count), last }
  const note = (userId, round) => {
    if (!userId || known.has(userId)) return;
    const t = traces.get(userId) || { names: new Map(), last: '' };
    const name = round?.players?.[0];
    if (typeof name === 'string' && name.trim()) t.names.set(name.trim(), (t.names.get(name.trim()) || 0) + 1);
    const when = round?.finishedAt || round?.date || '';
    if (when > t.last) t.last = when;
    traces.set(userId, t);
  };
  rounds.forEach((r) => note(r.userId, r));
  userRows
    .filter((r) => typeof r.id === 'string' && r.id.startsWith('active_round_'))
    .forEach((r) => note(r.userId, r.round));

  [...traces.entries()]
    .sort((a, b) => b[1].last.localeCompare(a[1].last))
    .forEach(([userId, t]) => {
      const name = [...t.names.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      attach(userId, name, t.last);
    });

  await putProfiles([...changed]);
};

// ─── 저장된 기록 보정 (한 번만) ──────────────────────────────────────────────
//
// 계산식 버그로 잘못 저장된 기록을 고치거나 기록 형식을 바꾼다. 끝나면 users 스토어에 표시를 남겨
// 다음부터는 건너뛴다.
//   includeActive  진행 중 라운드도 대상으로 할지
//   backup         바꾼 라운드의 원본을 users 스토어('backup:<key>')에 남길지 — 되돌릴 길을 둔다
// 반환: 고친 개수 (이미 끝났으면 0).
const MIGRATION_PAR3_KEY = 'migration:par3-missed-green-strokes';
const MIGRATION_NINE_KEY = 'migration:partial-18-to-nine';

const runRoundMigration = async (key, fixRound, { includeActive = true, backup = false } = {}) => {
  await ensureDB();
  const readTx = db.transaction([USERS_STORE, ROUNDS_STORE], 'readonly');
  const [done, rounds, userRows] = await Promise.all([
    asPromise(readTx.objectStore(USERS_STORE).get(key)),
    asPromise(readTx.objectStore(ROUNDS_STORE).getAll()),
    asPromise(readTx.objectStore(USERS_STORE).getAll()),
  ]);
  if (done) return 0;

  let total = 0;
  const fixedRounds = [];
  const originals = [];
  rounds.forEach((r) => {
    const { round, changed } = fixRound(r);
    if (changed > 0) { fixedRounds.push(round); originals.push(r); total += changed; }
  });
  const fixedActive = [];
  if (includeActive) {
    userRows
      .filter((row) => typeof row.id === 'string' && row.id.startsWith('active_round_') && row.round)
      .forEach((row) => {
        const { round, changed } = fixRound(row.round);
        if (changed > 0) { fixedActive.push({ ...row, round }); total += changed; }
      });
  }

  // 고친 기록과 완료 표시를 한 트랜잭션으로 — 중간에 끊겨도 반만 고쳐진 채
  // 완료로 남지 않는다 (다음 실행 때 처음부터 다시 한다).
  const tx = db.transaction([USERS_STORE, ROUNDS_STORE], 'readwrite');
  const committed = new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  const at = new Date().toISOString();
  fixedRounds.forEach((r) => tx.objectStore(ROUNDS_STORE).put(r));
  fixedActive.forEach((row) => tx.objectStore(USERS_STORE).put(row));
  if (backup && originals.length > 0) tx.objectStore(USERS_STORE).put({ id: `backup:${key}`, at, rounds: originals });
  tx.objectStore(USERS_STORE).put({ id: key, at, fixedHoles: total });
  await committed;
  return total;
};

// 파3 타수 누락 보정 — 끝난 라운드와 진행 중 라운드 모두 대상. 반환: 고친 홀 수
export const migrateRoundData = (fixRound) => runRoundMigration(MIGRATION_PAR3_KEY, fixRound);

// "18홀 중 9홀만 입력"한 예전 라운드를 9홀 라운드로 바꾼다 (engine/nineConversion.js). 끝난 라운드만 대상이고,
// 바꾼 라운드의 원본은 'backup:migration:partial-18-to-nine' 에 남긴다. 반환: 바꾼 라운드 수
export const migrateNineHoleRounds = (convert) => runRoundMigration(MIGRATION_NINE_KEY, convert, { includeActive: false, backup: true });

// 보정 전 원본 백업 (없으면 null) — 변환을 되돌릴 때 쓴다
export const loadNineConversionBackup = async () => {
  await ensureDB();
  const store = db.transaction([USERS_STORE], 'readonly').objectStore(USERS_STORE);
  return (await asPromise(store.get(`backup:${MIGRATION_NINE_KEY}`))) ?? null;
};

// 시각만으로 만들면 같은 밀리초에 만든 두 프로필의 id 가 같아져 기록이 섞인다 — 무작위 꼬리를 붙인다.
const newUserId = () => `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// 이름으로 로그인 — 같은 이름(대소문자·앞뒤 공백 무시)의 프로필이 있으면 그대로 쓴다.
export const loginByName = async (userName) => {
  const name = userName.trim();
  const existing = (await listProfiles()).find((p) => normName(p.userName) === normName(name));
  const profile = existing
    ? { ...existing, lastUsedAt: new Date().toISOString() }
    : { userId: newUserId(), userName: name, aliases: [], lastUsedAt: new Date().toISOString() };
  await putProfiles([profile]);
  await setCurrentUser(profile.userId, profile.userName);
  return profile;
};

// 사용자 삭제 — 프로필과 그 사용자의 모든 기록(라운드·클럽·진행 중 라운드)을
// 이 기기에서 영구히 지운다. 예전 ID(aliases)에 남은 기록까지 함께 지운다.
export const deleteProfile = async (profile) => {
  await ensureDB();
  const ids = userIdsOf(profile);
  const tx = db.transaction([ROUNDS_STORE, CLUBS_STORE, USERS_STORE], 'readwrite');
  const done = new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  const rounds = tx.objectStore(ROUNDS_STORE);
  const clubs = tx.objectStore(CLUBS_STORE);
  const users = tx.objectStore(USERS_STORE);
  ids.forEach((id) => {
    rounds.index('userId').openKeyCursor(IDBKeyRange.only(id)).onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) { rounds.delete(cursor.primaryKey); cursor.continue(); }
    };
    clubs.delete(id);
    users.delete(`active_round_${id}`);
  });
  users.delete(PROFILE_PREFIX + profile.userId);
  // 9홀 변환 원본 백업에 남은 이 사용자의 라운드도 함께 지운다 ('영구히 삭제'에 백업이 빠지지 않게)
  users.get(`backup:${MIGRATION_NINE_KEY}`).onsuccess = (e) => {
    const row = e.target.result;
    if (!row) return;
    const rest = (row.rounds || []).filter((r) => !ids.includes(r.userId));
    if (rest.length === 0) users.delete(row.id);
    else if (rest.length !== row.rounds.length) users.put({ ...row, rounds: rest });
  };
  ids.forEach((id) => { users.delete(BACKUP_META_PREFIX + id); users.delete(GOALS_PREFIX + id); users.delete(PREFS_PREFIX + id); });
  // 휴지통에 남은 이 사용자의 라운드도 함께 지운다 ('영구히 삭제'에 휴지통이 빠지지 않게)
  users.getAll().onsuccess = (e) => {
    (e.target.result || [])
      .filter((row) => typeof row.id === 'string' && row.id.startsWith(TRASH_PREFIX) && ids.includes(row.userId))
      .forEach((row) => users.delete(row.id));
  };
  users.get('current').onsuccess = (e) => {
    if (ids.includes(e.target.result?.userId)) users.delete('current');
  };
  await done;
};

// ─── 목표 ────────────────────────────────────────────────────────────────────
// 다음 라운드 목표 (engine/goals.js) — 사용자마다 최대 2개. { id: 'goals:<userId>', userId, goals: [...], updatedAt }
const GOALS_PREFIX = 'goals:';

export const getGoals = async (userId) => {
  await ensureDB();
  const store = db.transaction([USERS_STORE], 'readonly').objectStore(USERS_STORE);
  const row = await asPromise(store.get(GOALS_PREFIX + userId));
  return sanitizeGoals(row?.goals);
};

// 저장하고, 검사를 거친 목록을 돌려준다
export const saveGoals = async (userId, goals) => {
  await ensureDB();
  const clean = sanitizeGoals(goals);
  const store = db.transaction([USERS_STORE], 'readwrite').objectStore(USERS_STORE);
  await asPromise(store.put({ id: GOALS_PREFIX + userId, userId, goals: clean, updatedAt: new Date().toISOString() }));
  return clean;
};

// ─── 설정 ────────────────────────────────────────────────────────────────────
// 사용자별 앱 설정 (지금은 거리 단위 { unit: 'm' | 'yd' }). { id: 'prefs:<userId>', userId, prefs, updatedAt }
// 기록은 늘 미터로 저장되고, 단위는 화면에 보이고 입력하는 방식만 바꾼다 (engine/units.js).
const PREFS_PREFIX = 'prefs:';

export const getPrefs = async (userId) => {
  await ensureDB();
  const store = db.transaction([USERS_STORE], 'readonly').objectStore(USERS_STORE);
  const row = await asPromise(store.get(PREFS_PREFIX + userId));
  return sanitizePrefs(row?.prefs);
};

// 저장하고, 검사를 거친 설정을 돌려준다
export const savePrefs = async (userId, prefs) => {
  await ensureDB();
  const clean = sanitizePrefs(prefs);
  const store = db.transaction([USERS_STORE], 'readwrite').objectStore(USERS_STORE);
  await asPromise(store.put({ id: PREFS_PREFIX + userId, userId, prefs: clean, updatedAt: new Date().toISOString() }));
  return clean;
};

// ─── 휴지통 ──────────────────────────────────────────────────────────────────
// 라운드를 지우면 바로 없애지 않고 휴지통에 7일 보관한다 — 실수로 지운 기록을 되돌릴 수 있게.
//   { id: 'trash:<roundId>', userId, round, deletedAt }   (users 스토어 — 스키마는 그대로)
// 보관 기간이 지난 것은 앱을 열 때 purgeExpiredTrash 가 지운다. 백업 파일에는 휴지통이 들어가지 않는다.
const TRASH_PREFIX = 'trash:';

const txDone = (tx) => new Promise((resolve, reject) => {
  tx.oncomplete = () => resolve();
  tx.onerror = () => reject(tx.error);
  tx.onabort = () => reject(tx.error);
});

// 라운드를 휴지통으로 옮긴다 (라운드 스토어에서는 지운다). at: 지운 시각 (테스트용)
export const trashRound = async (round, userId, at = new Date()) => {
  await ensureDB();
  const tx = db.transaction([ROUNDS_STORE, USERS_STORE], 'readwrite');
  const done = txDone(tx);
  tx.objectStore(USERS_STORE).put({ id: TRASH_PREFIX + round.id, userId: round.userId ?? userId, round, deletedAt: new Date(at).toISOString() });
  tx.objectStore(ROUNDS_STORE).delete(round.id);
  await done;
};

// 이 사용자(들)의 휴지통 — 최근에 지운 것이 앞
export const listTrash = async (ids) => {
  await ensureDB();
  const mine = new Set(toIds(ids));
  const store = db.transaction([USERS_STORE], 'readonly').objectStore(USERS_STORE);
  const rows = await asPromise(store.getAll());
  return rows
    .filter((r) => typeof r.id === 'string' && r.id.startsWith(TRASH_PREFIX) && mine.has(r.userId))
    .sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
};

// 휴지통에서 라운드를 되살린다. 같은 번호의 라운드가 이미 있으면(예: 백업을 가져와 다시 생긴 경우) 덮어쓰지 않고
// 휴지통에서만 지운다. 반환: 되살린 라운드 | null
export const restoreFromTrash = async (roundId) => {
  await ensureDB();
  const read = db.transaction([USERS_STORE, ROUNDS_STORE], 'readonly');
  const [row, existing] = await Promise.all([
    asPromise(read.objectStore(USERS_STORE).get(TRASH_PREFIX + roundId)),
    asPromise(read.objectStore(ROUNDS_STORE).get(roundId)),
  ]);
  if (!row) return null;
  const tx = db.transaction([USERS_STORE, ROUNDS_STORE], 'readwrite');
  const done = txDone(tx);
  tx.objectStore(USERS_STORE).delete(TRASH_PREFIX + roundId);
  if (!existing) tx.objectStore(ROUNDS_STORE).put(row.round);
  await done;
  return existing ? null : row.round;
};

// 휴지통에서 영구 삭제
export const deleteFromTrash = async (roundId) => {
  await ensureDB();
  const store = db.transaction([USERS_STORE], 'readwrite').objectStore(USERS_STORE);
  await asPromise(store.delete(TRASH_PREFIX + roundId));
};

// 보관 기간(7일)이 지난 라운드를 모든 사용자에서 지운다. 반환: 지운 개수
export const purgeExpiredTrash = async (now = Date.now()) => {
  await ensureDB();
  const rows = await asPromise(db.transaction([USERS_STORE], 'readonly').objectStore(USERS_STORE).getAll());
  const expired = rows.filter((r) => typeof r.id === 'string' && r.id.startsWith(TRASH_PREFIX)
    && isTrashExpired(r.deletedAt, now));
  if (expired.length === 0) return 0;
  const tx = db.transaction([USERS_STORE], 'readwrite');
  const done = txDone(tx);
  expired.forEach((r) => tx.objectStore(USERS_STORE).delete(r.id));
  await done;
  return expired.length;
};

// ─── 백업 기록 ───────────────────────────────────────────────────────────────
// 마지막으로 백업 파일을 만든(저장·공유한) 시각과 그때의 라운드 수. 홈이 "마지막 백업 N일 전"을 알리는 데 쓴다.
//   { id: 'backup-meta:<userId>', userId, lastBackupAt, roundCount, via: 'download' | 'share' }
const BACKUP_META_PREFIX = 'backup-meta:';

export const getBackupMeta = async (userId) => {
  await ensureDB();
  const store = db.transaction([USERS_STORE], 'readonly').objectStore(USERS_STORE);
  return (await asPromise(store.get(BACKUP_META_PREFIX + userId))) ?? null;
};

export const recordBackup = async (userId, { roundCount, via = 'download' }) => {
  await ensureDB();
  const row = { id: BACKUP_META_PREFIX + userId, userId, lastBackupAt: new Date().toISOString(), roundCount, via };
  const store = db.transaction([USERS_STORE], 'readwrite').objectStore(USERS_STORE);
  await asPromise(store.put(row));
  return row;
};

// 'current'에 들어 있는 사용자를 프로필 형태로 돌려준다.
export const getCurrentProfile = async () => {
  const current = await getCurrentUser();
  if (!current) return null;
  const profiles = await listProfiles();
  return profiles.find((p) => userIdsOf(p).includes(current.userId))
    || { userId: current.userId, userName: current.userName, aliases: [] };
};

// 현재 사용자 저장
export const setCurrentUser = async (userId, userName) => {
  await ensureDB();
  const store = db.transaction([USERS_STORE], 'readwrite').objectStore(USERS_STORE);
  await asPromise(store.put({ id: 'current', userId, userName }));
};

// 로그아웃 — 다음 실행 때 로그인 화면이 뜨게 한다. 기록은 지우지 않는다.
export const clearCurrentUser = async () => {
  await ensureDB();
  const store = db.transaction([USERS_STORE], 'readwrite').objectStore(USERS_STORE);
  await asPromise(store.delete('current'));
};

// 현재 사용자 조회
export const getCurrentUser = async () => {
  await ensureDB();
  const store = db.transaction([USERS_STORE], 'readonly').objectStore(USERS_STORE);
  return (await asPromise(store.get('current'))) || null;
};

// ─── 클럽 ────────────────────────────────────────────────────────────────────

// 사용자 클럽 설정 로드 — 여러 ID면 앞에서부터 처음 찾은 것
export const loadClubsByUser = async (ids) => {
  await ensureDB();
  const store = db.transaction([CLUBS_STORE], 'readonly').objectStore(CLUBS_STORE);
  // 한 트랜잭션 안에서 요청을 모두 먼저 건다 — await 사이에 트랜잭션이 닫히는
  // 브라우저(구형 Safari)가 있다.
  const results = await Promise.all(toIds(ids).map((id) => asPromise(store.get(id))));
  return results.find((r) => r?.clubs)?.clubs ?? null;
};

// 사용자 클럽 설정 저장
export const saveClubsForUser = async (userId, clubs) => {
  await ensureDB();
  const store = db.transaction([CLUBS_STORE], 'readwrite').objectStore(CLUBS_STORE);
  await asPromise(store.put({ userId, clubs, updatedAt: new Date().toISOString() }));
};

// ─── 진행 중인 라운드 ─────────────────────────────────────────────────────────

export const saveActiveRound = async (userId, round) => {
  await ensureDB();
  const store = db.transaction([USERS_STORE], 'readwrite').objectStore(USERS_STORE);
  await asPromise(store.put({ id: `active_round_${userId}`, userId, round }));
};

// 여러 ID면 앞에서부터 처음 찾은 것
export const loadActiveRound = async (ids) => {
  await ensureDB();
  const store = db.transaction([USERS_STORE], 'readonly').objectStore(USERS_STORE);
  const results = await Promise.all(toIds(ids).map((id) => asPromise(store.get(`active_round_${id}`))));
  return results.find((r) => r?.round)?.round ?? null;
};

// 여러 ID 모두에서 지운다 — 예전 ID에 남은 진행 중 라운드가 되살아나지 않게.
export const clearActiveRound = async (ids) => {
  await ensureDB();
  const store = db.transaction([USERS_STORE], 'readwrite').objectStore(USERS_STORE);
  await Promise.all(toIds(ids).map((id) => asPromise(store.delete(`active_round_${id}`))));
};

// ─── 백업 ────────────────────────────────────────────────────────────────────

// 사용자의 모든 데이터 Export (JSON)
export const exportUserData = async (user) => {
  const ids = userIdsOf(user);
  const [rounds, clubs, goals, prefs] = await Promise.all([loadRoundsByUser(ids), loadClubsByUser(ids), getGoals(user.userId), getPrefs(user.userId)]);
  return {
    version: '1.0',
    exportDate: new Date().toISOString(),
    userId: user.userId,
    data: {
      rounds: rounds || [],
      clubs: clubs || [],
      goals,
      prefs,
    },
  };
};

// 사용자의 모든 데이터 Import (JSON) — 병합만 한다.
// 같은 id의 라운드는 파일 내용으로 바뀌고, 파일에 없는 기존 라운드는 그대로 남는다.
// (예전에는 기존 라운드를 전부 지운 뒤 넣어서, 오래된 백업을 가져오면 그 뒤
// 기록이 사라졌다. 화면 안내 문구도 '병합'이었다.)
// 클럽은 파일에 들어 있을 때만 바꾼다 — 빈 배열로 기존 설정을 지우지 않게.
//
// ownIds: 이 사용자의 기록이 들어 있을 수 있는 userId 전부(대표 userId + 예전 aliases). 같은 id 의
// 라운드가 이미 있어도 그 소유자가 ownIds 안이면 같은 사용자의 기록이라 파일 내용으로 바꾼다.
// 소유자가 다른 사용자면 그 기록을 빼앗지 않는다 — 한 기기에서 A 의 백업을 B 프로필로 복원해도 A 의
// 라운드가 B 로 옮겨가 사라지지 않게, 가져온 쪽에 새 id 를 줘서 사본으로 넣는다.
// 반환: { imported: 저장한 라운드 수, remapped: 새 id 를 받은 라운드 수 }
export const importUserData = async (userId, importedData, ownIds = [userId]) => {
  const { data } = importedData;
  const result = await saveImportedRounds(userId, data.rounds || [], ownIds);
  if (Array.isArray(data.clubs) && data.clubs.length > 0) {
    await saveClubsForUser(userId, data.clubs);
  }
  // 목표도 파일에 들어 있을 때만 바꾼다 — 빈 목록으로 지금 목표를 지우지 않게 (클럽과 같다)
  if (Array.isArray(data.goals) && data.goals.length > 0) {
    await saveGoals(userId, data.goals);
  }
  // 거리 단위 설정도 파일에 들어 있을 때만 (예전 백업에는 없다)
  if (data.prefs && typeof data.prefs === 'object') {
    await savePrefs(userId, data.prefs);
  }
  return result;
};

// 다른 사용자와 id 가 겹친 라운드의 새 id. 가져오는 사용자별로 정해져 있어서 같은 파일을 다시 가져와도
// 같은 사본을 덮어쓸 뿐 늘어나지 않는다.
const remappedRoundId = (roundId, userId) => `${roundId}__${userId}`;

// Import할 라운드 저장
const saveImportedRounds = async (userId, rounds, ownIds) => {
  if (rounds.length === 0) return { imported: 0, remapped: 0 };
  await ensureDB();
  // 겹치는 id 의 현재 소유자를 먼저 한 번에 조회한다 (한 트랜잭션에 요청을 모두 건다)
  const readStore = db.transaction([ROUNDS_STORE], 'readonly').objectStore(ROUNDS_STORE);
  const existing = await Promise.all(rounds.map((round) => asPromise(readStore.get(round.id))));
  const own = new Set(ownIds);

  let remapped = 0;
  const toSave = rounds.map((round, i) => {
    const owner = existing[i]?.userId;
    if (owner && !own.has(owner)) {
      remapped++;
      return { ...round, id: remappedRoundId(round.id, userId), userId };
    }
    return { ...round, userId };
  });

  const store = db.transaction([ROUNDS_STORE], 'readwrite').objectStore(ROUNDS_STORE);
  await Promise.all(toSave.map((round) => asPromise(store.put(round))));
  return { imported: toSave.length, remapped };
};
