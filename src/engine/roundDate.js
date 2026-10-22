// 'YYYY-MM-DD'(input type="date" 값)를 그날 로컬 정오의 ISO 문자열로 바꾼다.
// 정오로 두는 이유: 저장 뒤 타임존이 달라져도 날짜가 하루 밀리지 않게.
// 비어 있거나 존재하지 않는 날짜(2026-02-30 등)면 null — 호출하는 쪽이 안내한다 (예외를 던지지 않는다).
export function localNoonISO(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr ?? ''));
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d, 12, 0, 0);
  // 2026-02-30 이 3월 2일로 넘어가는 것을 걸러낸다
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date.toISOString();
}
