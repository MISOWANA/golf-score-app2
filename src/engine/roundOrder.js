// 라운드 순서 — 날짜가 같으면(같은 날 두 번 친 경우) 나중에 시작한 라운드가 뒤다.
//
// 라운드 날짜는 날짜 입력칸에서 'YYYY-MM-DD' 만 저장해 시각이 없다. 그래서 날짜만으로 정렬하면 같은 날 친 두 라운드가
// 동점이 되어, 먼저 친 라운드가 "최근 라운드 · 이번 라운드"로 잡힌다. 라운드 id 는 시작한 시각(ms)이라 동점일 때 그것으로 가른다.
// 정렬·"이 라운드보다 먼저 친 라운드" 판단은 모두 이 비교를 쓴다.

const idOrder = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), 'en', { numeric: true });

// 오래된 것이 앞
export const compareRoundsAsc = (a, b) => (new Date(a.date) - new Date(b.date)) || idOrder(a.id, b.id);

// 최근 것이 앞
export const compareRoundsDesc = (a, b) => compareRoundsAsc(b, a);

// a 가 b 보다 먼저 친 라운드인가
export const playedBefore = (a, b) => compareRoundsAsc(a, b) < 0;
