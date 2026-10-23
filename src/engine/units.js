// ─── 거리 단위 (미터 · 야드) ─────────────────────────────────────────────────────────
//
// 기록은 늘 미터로 저장한다 — 단위를 바꿔도 기록·통계 계산은 그대로이고 화면 표시와 입력만 달라진다.
//   미터   샷 거리 · 퍼트 거리 모두 m
//   야드   샷 거리는 야드(yd), 퍼트 거리는 피트(ft) — 야드를 쓰는 골퍼는 퍼트를 피트로 재기 때문이다
//
// 현재 단위는 이 모듈이 들고 있다 (앱이 로그인한 사용자의 설정으로 setUnit 을 부른다). 화면과 엔진의 문구 만드는 함수가
// 같은 값을 읽어서 숫자와 문장이 어긋나지 않는다. 입력 칸은 표시 단위로 받아 미터로 바꿔 저장한다.

export const UNIT_IDS = ['m', 'yd'];
export const M_TO_YD = 1.0936133;
export const M_TO_FT = 3.280839895;

export const UNITS = {
  m: { id: 'm', name: '미터', shot: 'm', putt: 'm', shotKo: 'm', puttKo: 'm', shotF: 1, puttF: 1 },
  yd: { id: 'yd', name: '야드', shot: 'yd', putt: 'ft', shotKo: '야드', puttKo: '피트', shotF: M_TO_YD, puttF: M_TO_FT },
};

let current = 'm';
export const getUnit = () => current;
export const setUnit = (id) => { if (UNITS[id]) current = id; };
export const isYards = (id = current) => id === 'yd';
export const unitInfo = (id = current) => UNITS[id] ?? UNITS.m;

// 저장된 설정 { unit } 을 검사해 돌려준다 — 모르는 값은 미터
export const sanitizePrefs = (p) => ({ unit: UNIT_IDS.includes(p?.unit) ? p.unit : 'm' });

const r1 = (n) => Math.round(n * 10) / 10;
const r2 = (n) => Math.round(n * 100) / 100;

// 표시 단위 ↔ 미터 변환 (kind: 'shot' | 'putt')
export const toDisplay = (meters, kind = 'shot', id = current) => (meters == null ? null : meters * unitInfo(id)[`${kind}F`]);
export const fromDisplay = (value, kind = 'shot', id = current) => {
  if (value == null) return null;
  const m = value / unitInfo(id)[`${kind}F`];
  return id === 'm' ? m : kind === 'putt' ? r2(m) : r1(m);   // 야드·피트로 받은 값은 소수로 저장해야 다시 보여 줄 때 같은 값이 나온다
};
export const unitLabel = (kind = 'shot', id = current) => unitInfo(id)[kind];

// 숫자를 글자로 — digits 를 주지 않으면 야드·피트는 정수, 미터는 정수면 정수 아니면 소수 첫째 자리
function num(v, digits, id) {
  if (id !== 'm') return String(Math.round(v));
  if (digits != null) return Number(v).toFixed(digits);
  return Number.isInteger(r1(v)) ? String(Math.round(v)) : r1(v).toFixed(1);
}

// 화면에 보이는 정수 값 (표 안의 숫자끼리 더하고 빼서 보여 줄 때 — 보이는 숫자끼리 맞게)
export const displayShot = (meters) => (meters == null ? null : Math.round(toDisplay(meters, 'shot')));

// 거리 문구 — fmtShot(137) → "137m" (미터) / "150yd" (야드). 샷 거리는 정수로 보여 준다 (digits 로 소수 자리를 줄 수 있다). 값이 없으면 fallback.
export function fmtShot(meters, { digits = 0, unit = true, fallback = '–', id = current } = {}) {
  if (meters == null || Number.isNaN(Number(meters))) return fallback;
  return `${num(toDisplay(Number(meters), 'shot', id), digits, id)}${unit ? unitLabel('shot', id) : ''}`;
}

// 퍼트·근접도처럼 짧은 거리 — fmtPutt(3.048) → "3m"(소수 첫째 자리까지) / "10ft"
export function fmtPutt(meters, { digits, unit = true, fallback = '–', id = current } = {}) {
  if (meters == null || Number.isNaN(Number(meters))) return fallback;
  const v = toDisplay(Number(meters), 'putt', id);
  return `${num(v, digits, id)}${unit ? unitLabel('putt', id) : ''}`;
}

// 범위 문구 "110–140m" / "120–153yd" (양 끝이 같으면 하나)
export function fmtShotRange(lo, hi, opts = {}) {
  const a = fmtShot(lo, { ...opts, unit: false });
  const b = fmtShot(hi, { ...opts, unit: false });
  const u = unitLabel('shot', opts.id ?? current);
  return a === b ? `${a}${u}` : `${a}–${b}${u}`;
}

// ─── 문장 속 미터 값 바꾸기 ──────────────────────────────────────────────────────────
// 인사이트·조언 문장은 "1.5m 이내", "110-140m 구간" 처럼 미터가 박혀 있다. 야드 단위일 때 화면에 보이기 직전에 바꾼다.
//   · 퍼트 이야기(퍼트·퍼팅이 있고 샷 이야기가 없는 문장)의 거리는 피트, 그 밖에는 12m 이하는 피트, 넘으면 야드로 본다.
//   · 근접도(핀까지 남은 거리) 문장은 30m 이하까지 피트로 본다.
//   · "100야드(약 91m)" 처럼 야드·피트로 쓴 값에 붙은 미터 풀이는 중복이라 뺀다.
const NUM = '\\d+(?:\\.\\d+)?';
const METER_RE = new RegExp(`(${NUM}(?:\\s?[~\\-–·]\\s?${NUM})*)\\s?m(?![A-Za-z/²0-9])`, 'g');
const PUTT_WORDS = /퍼트|퍼팅|퍼터/;
const SHOT_WORDS = /어프로치|드라이버|티샷|세컨|클럽|아이언|우드|샷|캐리|토탈/;
const PUTT_SCALE_MAX_M = 12;
const PROXIMITY_SCALE_MAX_M = 30;

// 야드·피트로 쓴 값의 미터 풀이 — 야드 단위에서는 중복이라 뺀다:  "100야드(약 91m)" → "100야드",  "114m(125야드)" · "1~2m(3~7피트)" → 야드·피트 쪽만
const RANGE = `${NUM}(?:\\s?[~\\-–]\\s?${NUM})*`;
const GLOSS_AFTER = new RegExp(`(${RANGE}(?:야드|피트))\\s?[(（](?:약\\s?)?${RANGE}m[)）]`, 'g');
const GLOSS_BEFORE = new RegExp(`${RANGE}m\\s?[(（]((?:약\\s?)?${RANGE}(?:야드|피트))[)）]`, 'g');

// abbr: 좁은 칸의 짧은 이름표용 — '120-153야드' 대신 '120-153yd', '26피트' 대신 '26ft'
export function localizeText(text, id = current, { abbr = false } = {}) {
  if (id === 'm' || typeof text !== 'string' || !text.includes('m')) return text;
  text = text.replace(GLOSS_AFTER, '$1').replace(GLOSS_BEFORE, '$1');
  const puttish = PUTT_WORDS.test(text) && !SHOT_WORDS.test(text);
  const puttMax = /근접/.test(text) ? PROXIMITY_SCALE_MAX_M : PUTT_SCALE_MAX_M;   // 근접도(핀까지 남은 거리)는 20m 넘게도 나온다
  return text.replace(METER_RE, (match, list, offset) => {
    const before = text.slice(Math.max(0, offset - 14), offset);
    if (/야드|피트|yd|ft/.test(before) && /[(（]/.test(before)) return match;     // "100야드(약 91m)" 같은 풀이
    const nums = list.match(new RegExp(NUM, 'g')).map(Number);
    const putt = puttish || Math.max(...nums) <= puttMax;
    const f = putt ? UNITS[id].puttF : UNITS[id].shotF;
    const word = abbr ? (putt ? UNITS[id].putt : UNITS[id].shot) : (putt ? UNITS[id].puttKo : UNITS[id].shotKo);
    const converted = list.replace(new RegExp(NUM, 'g'), (n) => String(Math.round(Number(n) * f)));
    return `${converted}${word}`;
  });
}

// 현재 단위로 바꾼 문장 — 화면에 보이기 직전에 감싼다. (미터일 때는 그대로)
export const tx = (text, opts) => localizeText(text, current, opts);

// 분석 결과(문장이 여러 곳에 들어 있는 객체·배열)를 통째로 현재 단위로 바꾼다. 문자열만 바꾸고 숫자·구조는 그대로 두며,
// 미터일 때는 같은 객체를 그대로 돌려준다. 일반 객체·배열만 따라 들어간다 (날짜 등은 그대로).
export function localizeDeep(value, id = current, depth = 0) {
  if (id === 'm' || value == null || depth > 24) return value;
  if (typeof value === 'string') return localizeText(value, id);
  if (Array.isArray(value)) return value.map((v) => localizeDeep(v, id, depth + 1));
  if (typeof value === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) return value;
    const out = {};
    for (const k of Object.keys(value)) out[k] = localizeDeep(value[k], id, depth + 1);
    return out;
  }
  return value;
}
