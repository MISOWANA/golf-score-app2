 /IndexedDB 초기화 및 관리 유틸리티/
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

// 사용자 클럽 설정 로드
export const loadClubsByUser = async (userId) => {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CLUBS_STORE], 'readonly');
    const store = transaction.objectStore(CLUBS_STORE);
    const request = store.get(userId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.clubs : null);
    };
  });
};

// 사용자 클럽 설정 저장
export const saveClubsForUser = async (userId, clubs) => {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CLUBS_STORE], 'readwrite');
    const store = transaction.objectStore(CLUBS_STORE);
    const request = store.put({
      userId,
      clubs,
      updatedAt: new Date().toISOString(),
    });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

// 진행 중인 라운드 저장
export const saveActiveRound = async (userId, round) => {
  if (!db) await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([USERS_STORE], 'readwrite');
    const store = transaction.objectStore(USERS_STORE);
    const request = store.put({ id: `active_round_${userId}`, userId, round });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

// 진행 중인 라운드 로드
export const loadActiveRound = async (userId) => {
  if (!db) await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([USERS_STORE], 'readonly');
    const store = transaction.objectStore(USERS_STORE);
    const request = store.get(`active_round_${userId}`);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.round : null);
    };
  });
};

// 진행 중인 라운드 삭제
export const clearActiveRound = async (userId) => {
  if (!db) await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([USERS_STORE], 'readwrite');
    const store = transaction.objectStore(USERS_STORE);
    const request = store.delete(`active_round_${userId}`);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

// 사용자의 모든 데이터 Export (JSON)
export const exportUserData = async (userId) => {
  if (!db) await initDB();

  try {
    const rounds = await loadRoundsByUser(userId);
    const clubs = await loadClubsByUser(userId);

    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      userId,
      data: {
        rounds: rounds || [],
        clubs: clubs || [],
      },
    };
  } catch (e) {
    console.error('Export failed', e);
    throw e;
  }
};

// 사용자의 모든 데이터 Import (JSON)
export const importUserData = async (userId, importedData, mergeMode = false) => {
  if (!db) await initDB();

  try {
    const { data } = importedData;

    if (!mergeMode) {
      // 덮어쓰기 모드: 기존 데이터 삭제 후 import
      const existingRounds = await loadRoundsByUser(userId);
      if (existingRounds && existingRounds.length > 0) {
        const transaction = db.transaction([ROUNDS_STORE], 'readwrite');
        const store = transaction.objectStore(ROUNDS_STORE);
        const index = store.index('userId');
        const request = index.openCursor(userId);

        return new Promise((resolve, reject) => {
          request.onerror = () => reject(request.error);
          request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
              cursor.delete();
              cursor.continue();
            } else {
              // 모든 기존 라운드 삭제 완료, 이제 새 데이터 저장
              saveImportedRounds(userId, data.rounds).then(() => {
                saveClubsForUser(userId, data.clubs || []).then(() => {
                  resolve();
                }).catch(reject);
              }).catch(reject);
            }
          };
        });
      }
    }

    // 병합 모드: 기존 데이터 유지하고 새 데이터 추가
    await saveImportedRounds(userId, data.rounds || []);
    await saveClubsForUser(userId, data.clubs || []);
  } catch (e) {
    console.error('Import failed', e);
    throw e;
  }
};

// Import할 라운드 저장
const saveImportedRounds = async (userId, rounds) => {
  if (!db) await initDB();

  const transaction = db.transaction([ROUNDS_STORE], 'readwrite');
  const store = transaction.objectStore(ROUNDS_STORE);

  return new Promise((resolve, reject) => {
    let completed = 0;
    const total = rounds.length;

    if (total === 0) {
      resolve();
      return;
    }

    rounds.forEach((round) => {
      const roundWithUser = { ...round, userId };
      const request = store.put(roundWithUser);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        completed++;
        if (completed === total) resolve();
      };
    });
  });
};
