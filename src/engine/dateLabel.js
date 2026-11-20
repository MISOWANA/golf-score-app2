// 라운드 날짜 표기 — 어느 화면에서나 연도까지 보여 준다 (해가 바뀌면 '9/20' 만으로는 어느 해 라운드인지 알 수 없다).
//   roundDateLabel   '26.9.20'        좁은 칸(칩 · 목록 · 표 · 막대 눈금)용 — 연도는 뒤 두 자리 (2026 을 줄마다 쓰면 눈이 아프다는 요청, 2026-11-13)
//   roundDateLong    '2026년 9월 20일'  넉넉한 칸(홈 · 히스토리)용
// 날짜를 읽을 수 없으면 값의 앞 10글자를 그대로 돌려주고(옛 기록이 깨져 보이지 않게), 값이 없으면 빈 글이다.

const toDate = (d) => {
  if (d == null || d === '') return null;
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? null : t;
};

export function roundDateLabel(d) {
  const t = toDate(d);
  if (!t) return d == null ? '' : String(d).slice(0, 10);
  return `${String(t.getFullYear()).slice(-2)}.${t.getMonth() + 1}.${t.getDate()}`;
}

export function roundDateLong(d) {
  const t = toDate(d);
  if (!t) return d == null ? '' : String(d).slice(0, 10);
  return `${t.getFullYear()}년 ${t.getMonth() + 1}월 ${t.getDate()}일`;
}
