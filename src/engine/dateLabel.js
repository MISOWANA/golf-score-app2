// 라운드 날짜 표기 — 어느 화면에서나 연도까지 보여 준다 (해가 바뀌면 '9/20' 만으로는 어느 해 라운드인지 알 수 없다).
//   roundDateLabel   '2026.9.20'      좁은 칸(칩 · 목록 · 표)용
//   roundDateLong    '2026년 9월 20일'  넉넉한 칸(홈 · 히스토리)용
//   roundDateParts   { md: '9/20', year: '2026' }  막대 아래 눈금처럼 두 줄로 쪼개 써야 하는 칸용
// 날짜를 읽을 수 없으면 값의 앞 10글자를 그대로 돌려주고(옛 기록이 깨져 보이지 않게), 값이 없으면 빈 글이다.

const toDate = (d) => {
  if (d == null || d === '') return null;
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? null : t;
};

export function roundDateLabel(d) {
  const t = toDate(d);
  if (!t) return d == null ? '' : String(d).slice(0, 10);
  return `${t.getFullYear()}.${t.getMonth() + 1}.${t.getDate()}`;
}

export function roundDateLong(d) {
  const t = toDate(d);
  if (!t) return d == null ? '' : String(d).slice(0, 10);
  return `${t.getFullYear()}년 ${t.getMonth() + 1}월 ${t.getDate()}일`;
}

export function roundDateParts(d) {
  const t = toDate(d);
  if (!t) return { md: d == null ? '' : String(d).slice(0, 10), year: '' };
  return { md: `${t.getMonth() + 1}/${t.getDate()}`, year: String(t.getFullYear()) };
}
