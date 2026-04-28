// IndexedDB 초기화 및 관리 유틸리티
const DB_NAME = 'GolfScoreDB';
const DB_VERSION = 1;
const ROUNDS_STORE = 'rounds';
const USERS_STORE = 'users';

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
    };
  });
};

// 사용자별 라운드 로드
export const loadRoundsByUser = async (userId) => {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ROUNDS_STORE], 'readonly');
    const store = transaction.objectStore(ROUNDS_STORE);
    const index = store.index('userId');
    const request = index.getAll(userId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      // createdAt으로 내림차순 정렬
      const rounds = request.result.sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
      });
      resolve(rounds);
    };
  });
};

// 라운드 저장
export const saveRound = async (round, userId) => {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ROUNDS_STORE], 'readwrite');
    const store = transaction.objectStore(ROUNDS_STORE);
    
    const roundWithUser = {
      ...round,
      userId,
      createdAt: round.createdAt || new Date().toISOString(),
    };

    const request = store.put(roundWithUser);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(roundWithUser);
  });
};

// 라운드 삭제
export const deleteRound = async (roundId) => {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ROUNDS_STORE], 'readwrite');
    const store = transaction.objectStore(ROUNDS_STORE);
    const request = store.delete(roundId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

// 현재 사용자 저장
export const setCurrentUser = async (userId, userName) => {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([USERS_STORE], 'readwrite');
    const store = transaction.objectStore(USERS_STORE);
    const request = store.put({ id: 'current', userId, userName });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

// 현재 사용자 조회
export const getCurrentUser = async () => {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([USERS_STORE], 'readonly');
    const store = transaction.objectStore(USERS_STORE);
    const request = store.get('current');

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const user = request.result;
      resolve(user || null);
    };
  });
};
