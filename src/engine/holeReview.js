// ─── 홀별 복기 데이터 (기획 목표: 홀 매니지먼트 + 라운드 후 복기) ─────────────
//
// "어떤 거리에서 어떤 채를 쓰고 어떤 결과가 있었는지"를 한 홀 단위로 모은다.
// clubDistance.js 의 extractClubShots 는 통계용이라 거리를 못 구한 샷을 버리지만,
// 복기에서는 클럽만 입력된 샷도 그대로 보여야 하므로 별도로 조립한다.

import { haversine, shotDistances, pinDistances, fieldShotCount, isHoledOut, saneRemaining } from './geo.js';

const CLUB_LABEL = { driver: 'DRIVER', wood: 'WOOD', hybrid: 'HYBRID', iron: 'IRON', wedge: 'WEDGE' };

const LIE_LABEL = {
  flat: '평지', uphill: '오르막', downhill: '내리막', hook: '훅', slice: '슬라이스',
  'uphill-slice': '오르막 슬라이스', 'uphill-hook': '오르막 훅',
  'downhill-slice': '내리막 슬라이스', 'downhill-hook': '내리막 훅',
};

const EXTRA_NAMES = ['써드샷', '포쓰샷', '피프스샷', '식스샷', '세븐샷', '에잇샷', '나인스샷', '텐스샷'];

export const shotName = (slot) =>
  slot === 0 ? '티샷' : slot === 1 ? '세컨샷' : (EXTRA_NAMES[slot - 2] ?? `${slot + 1}번째 샷`);

export const clubLabel = (club, sub) => {
  if (!club) return null;
  const base = CLUB_LABEL[club] ?? String(club).toUpperCase();
  if (!sub) return base;
  // 웨지는 서브값이 각도(52 → 52°), 나머지는 3W·7I 처럼 그 자체가 이름이다.
  if (club === 'wedge' && /^\d+$/.test(String(sub))) return `${base} ${sub}°`;
  return `${base} ${sub}`;
};

export const lieLabel = (lie) => {
  const v = Array.isArray(lie) ? lie[0] : lie;
  return v ? (LIE_LABEL[v] ?? v) : null;
};

const firstPuttDistance = (s) => s.puttDetails?.[0]?.distance ?? null;

// 한 샷의 결과를 사람이 읽는 한 줄로.
const shotResult = (slot, s, par, lastSlot) => {
  if (slot === 0) {
    if (s.teeGIR === true) return { text: '그린 (1온)', tone: 'good' };
    if (par === 3) {
      if (s.gir === true) return { text: '온그린', tone: 'good' };
      if (s.gir === false) return { text: '그린 놓침', tone: 'bad' };
      return null;
    }
    if (s.fairway === true) return { text: '페어웨이', tone: 'good' };
    if (s.fairway === false) {
      const where = s.fairwayHit ? ` (${s.fairwayHit})` : '';
      return { text: `페어웨이 놓침${where}`, tone: 'bad' };
    }
    return null;
  }
  // 세컨샷 이후
  const isExtra = slot >= 2;
  const shot = isExtra ? s.extraShots?.[slot - 2] : null;
  const onGreen = isExtra ? shot?.onGreen : (par === 3 ? s.onGreen : s.gir);
  if (onGreen === 'chip-in') return { text: '칩인', tone: 'great' };
  if (onGreen === true) return { text: '온그린', tone: 'good' };
  if (onGreen === false) return { text: '그린 놓침', tone: 'bad' };
  if (slot === lastSlot && s.gir === true) return { text: '온그린', tone: 'good' };
  return null;
};

export function buildHoleReview(hole, player, holeIdx) {
  const s = hole?.scores?.[player];
  if (!s) return null;

  const par = hole.par;
  const n = fieldShotCount(s, par);
  const gpsDist = shotDistances(s.gpsPoints, s.gpsGreen, n);
  const toPin = pinDistances(s.gpsPoints, s.gpsPin, n).map(saneRemaining);
  const holeLength = toPin[0] ?? null;          // 티박스 → 핀 = 그날 실제 전장

  const clubFor = (slot) => {
    if (slot === 0) return clubLabel(s.teeClub, s.teeClubSub);
    if (slot === 1) return clubLabel(s.secondClub, s.secondClubSub);
    const e = s.extraShots?.[slot - 2];
    return clubLabel(e?.club, e?.subClub);
  };
  const lieFor = (slot) => {
    if (slot === 0) return null;                 // 티샷은 티업
    if (slot === 1) return lieLabel(s.terrainCondition);
    return lieLabel(s.extraShots?.[slot - 2]?.lie);
  };
  // 그 샷을 치기 전 남은 거리 — 핀을 찍었으면 실측, 아니면 사용자 입력값.
  const fromFor = (slot) => {
    const measured = toPin[slot] ?? null;
    if (measured != null) return { value: measured, measured: true };
    const manual = slot === 1 ? s.remainingDistance : s.extraShots?.[slot - 2]?.remainingDistance;
    if (slot === 0) return holeLength != null ? { value: holeLength, measured: true } : null;
    return manual != null ? { value: manual, measured: false } : null;
  };

  const shots = Array.from({ length: n }, (_, slot) => ({
    slot,
    name: shotName(slot),
    club: clubFor(slot),
    lie: lieFor(slot),
    shape: slot === 0 ? (s.shotShape ?? null) : null,
    from: fromFor(slot),                          // 치기 전 남은 거리
    distance: gpsDist[slot] ?? null,              // 실제로 날아간 거리 (GPS)
    result: shotResult(slot, s, par, n - 1),
  }));

  const putts = (s.puttDetails || []).map((p, i) => ({
    no: i + 1,
    distance: p?.distance ?? null,
    aimDistance: p?.aimDistance ?? null,
    lie: lieLabel(p?.lie),
    holein: p?.holein ?? null,
  }));

  const penalty = (s.ob || 0) + (s.hazard || 0);

  return {
    holeIdx, holeNo: holeIdx + 1, par,
    strokes: s.strokes ?? null,
    diff: s.strokes != null ? s.strokes - par : null,
    puttCount: s.putts ?? 0,
    gir: s.gir ?? null,
    fairway: s.fairway ?? null,
    ob: s.ob || 0,
    hazard: s.hazard || 0,
    penalty,
    memo: s.memo || '',
    holeLength,
    // 그린 도착 시 핀까지 = 첫 퍼팅 거리. 사용자가 입력한 값을 우선한다 —
    // 퍼팅 거리는 몇 m 단위라 두 GPS 점의 합성 오차(±7m 안팎)가 값 자체보다
    // 커질 수 있다. 입력이 없을 때만 그린 도착점↔핀 실측으로 대체.
    approachProximity: firstPuttDistance(s) ?? haversine(s.gpsGreen, s.gpsPin),
    holedOut: isHoledOut(s),
    shots,
    putts,
    gps: {
      points: s.gpsPoints || [],
      green: s.gpsGreen || null,
      pin: s.gpsPin || null,
      fieldShots: n,
      hasAny: (s.gpsPoints || []).some(Boolean) || !!s.gpsGreen || !!s.gpsPin,
    },
  };
}
