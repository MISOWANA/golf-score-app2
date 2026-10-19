import { useEffect, useState } from 'react';
import { loadClubsByUser, userIdsOf } from '../../db.js';

// 마이백에 저장한 클럽 목록 — 클럽 추천의 재료.
//   undefined  불러오는 중
//   null       저장한 적 없음 (마이백에서 거리를 한 번도 바꾸지 않음) 또는 불러오기 실패
//   배열        저장된 클럽
// 마이백을 열기만 한 기본값은 저장되지 않는다. 남의 평균 같은 기본 거리로 추천하면
// 오히려 틀린 클럽을 권하게 되므로, 직접 설정해 저장한 뒤부터 추천한다.
export function useBagClubs(user) {
  const [loaded, setLoaded] = useState({ userId: null, clubs: undefined });
  const userId = user?.userId ?? null;

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    loadClubsByUser(userIdsOf(user))
      .then((saved) => { if (!cancelled) setLoaded({ userId, clubs: Array.isArray(saved) ? saved : null }); })
      .catch((e) => {
        console.error('Load clubs failed', e);
        if (!cancelled) setLoaded({ userId, clubs: null });
      });
    return () => { cancelled = true; };
  // aliases는 userId가 같으면 바뀌지 않는다 (프로필 단위로 함께 움직임)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (!user) return null;
  // 다른 사용자로 바뀐 직후엔 이전 사용자의 마이백을 보여주지 않는다
  return loaded.userId === userId ? loaded.clubs : undefined;
}
