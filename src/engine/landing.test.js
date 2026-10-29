import { describe, it, expect } from 'vitest';
import { landingCounts, landingSummary, landingCaption, landingHour, quadrantOf } from './landing.js';
import { shortGameShots } from './shortGamePattern.js';
import { shortGameLandingShot } from './clubDistance.js';
import { defaultScore } from '../test/fixtures.js';

const ME = '테스터';

// 파4 세컨샷을 from(m) 에서 쳐서 그린에 올린 홀 — 랜딩 hour 시
const approach = (from, hour, over = {}) => ({
  par: 4,
  scores: {
    [ME]: {
      ...defaultScore(4), touched: true, confirmed: true, teeClub: 'driver',
      secondClub: 'iron', secondClubSub: '7I', remainingDistance: from, onGreen: true, gir: true, girAuto: false,
      putts: 2, puttDetails: [{ distance: 2, holein: 'fail' }, { distance: 0.5, holein: 'success' }],
      onGreenLanding: hour, ...over,
    },
  },
});
// 파3 티샷으로 그린에 올린 홀 (세컨샷 이후가 없다)
const par3Tee = (hour) => ({
  par: 3,
  scores: { [ME]: { ...defaultScore(3), touched: true, confirmed: true, teeClub: 'iron', teeOnGreen: true, gir: true, girAuto: false, putts: 2, puttDetails: [{ distance: 4, holein: 'fail' }, { distance: 0.5, holein: 'success' }], onGreenLanding: hour } },
});
// 파4 티샷 1온
const driveOnGreen = (hour) => ({
  par: 4,
  scores: { [ME]: { ...defaultScore(4), touched: true, confirmed: true, teeClub: 'driver', teeGIR: true, gir: true, girAuto: false, putts: 2, puttDetails: [{ distance: 8, holein: 'fail' }, { distance: 0.5, holein: 'success' }], onGreenLanding: hour } },
});
const roundOf = (holes, id = 'r') => ({ id, date: '2026-06-01T00:00:00.000Z', players: [ME], holes });

describe('landingCounts — 풀샷(80m 밖)의 방향만 센다', () => {
  it('80m 밖 어프로치 · 파3 티샷 · 1온은 센다', () => {
    const { counts, total, shortGame } = landingCounts([roundOf([approach(150, 6), approach(120, 6), par3Tee(3), driveOnGreen(12)])]);
    expect(counts).toEqual({ 6: 2, 3: 1, 12: 1 });
    expect([total, shortGame]).toEqual([4, 0]);
  });

  it('80m 안에서 친 샷으로 올린 홀은 세지 않고, 몇 홀인지만 shortGame 에 돌려준다', () => {
    const { counts, total, shortGame } = landingCounts([roundOf([approach(150, 6), approach(30, 6), approach(79, 9), approach(5, 12)])]);
    expect(counts).toEqual({ 6: 1 });
    expect([total, shortGame]).toEqual([1, 3]);
  });

  it('경계: 80m 정확히는 풀샷(센다), 79m 는 숏게임(세지 않는다)', () => {
    expect(landingCounts([roundOf([approach(80, 6)])]).total).toBe(1);
    expect(landingCounts([roundOf([approach(79, 6)])]).total).toBe(0);
  });

  it('남은 거리를 입력하지 않아 거리를 모르는 샷은 풀샷 쪽에 둔다 (숏게임은 거리를 알아야 센다)', () => {
    const { total, shortGame } = landingCounts([roundOf([approach(null, 6)])]);
    expect([total, shortGame]).toEqual([1, 0]);
  });

  it('그린에 올리지 못한 80m 안 샷은 숏게임으로 치지 않는다', () => {
    const missed = approach(30, 6, { onGreen: false, gir: false, extraShots: [{ club: 'wedge', subClub: '56', remainingDistance: 10, onGreen: null, lie: 'flat' }] });
    expect(landingCounts([roundOf([missed])]).total).toBe(1);
  });

  it('랜딩 방향이 없거나 1~12 가 아니면 세지 않고, 예전 기록의 숫자 문자열은 받는다', () => {
    const { counts, total, shortGame } = landingCounts([roundOf([approach(150, null), approach(150, 13), approach(150, '4'), approach(150, '')])]);
    expect(counts).toEqual({ 4: 1 });
    expect([total, shortGame]).toEqual([1, 0]);
  });

  it('includeShortGame 이면 거리와 상관없이 모두 센다 (예전 분포와 같은 값)', () => {
    const rounds = [roundOf([approach(150, 6), approach(30, 6), par3Tee(3)])];
    expect(landingCounts(rounds, undefined, { includeShortGame: true })).toMatchObject({ total: 3, shortGame: 0, counts: { 6: 2, 3: 1 } });
  });

  it('누구의 기록인지 playerOf 로 정한다 (기본은 첫 번째 플레이어)', () => {
    const r = roundOf([approach(150, 6)]);
    r.players = [ME, '친구'];
    r.holes[0].scores['친구'] = { ...r.holes[0].scores[ME], onGreenLanding: 12 };
    expect(landingCounts([r]).counts).toEqual({ 6: 1 });
    expect(landingCounts([r], (x) => x.players[1]).counts).toEqual({ 12: 1 });
  });

  it('깨진 기록(점수 · 홀이 없음)에도 던지지 않는다', () => {
    expect(landingCounts([{ players: [ME], holes: [{ par: 4 }, { par: 4, scores: {} }, null].filter(Boolean) }])).toMatchObject({ total: 0, shortGame: 0 });
    expect(landingCounts([{ players: [ME] }])).toMatchObject({ total: 0 });
    expect(landingCounts([])).toMatchObject({ total: 0, counts: {} });
  });
});

describe('분포와 핀 기준 탄착은 같은 샷을 두 번 세지 않는다', () => {
  const holes = [approach(150, 6), approach(140, 5), approach(100, 12), par3Tee(3), approach(30, 6), approach(20, 3), approach(60, 9), approach(79, 6, { puttDetails: [] })];

  it('모든 랜딩 기록은 분포(풀샷)와 숏게임 둘 중 한 곳에만 들어간다', () => {
    const all = landingCounts([roundOf(holes)], undefined, { includeShortGame: true }).total;
    const full = landingCounts([roundOf(holes)]);
    expect(full.total + full.shortGame).toBe(all);
    expect(full.total).toBe(4);
    expect(full.shortGame).toBe(4);
  });

  it('핀 기준 탄착에 들어간 샷의 홀은 모두 분포에서 빠진 홀이다', () => {
    const round = roundOf(holes);
    const pattern = shortGameShots([round]);
    const inPattern = round.holes.filter((h) => shortGameLandingShot(h, ME));
    expect(pattern.shots.length).toBeGreaterThan(0);
    expect(pattern.shots.length).toBeLessThanOrEqual(inPattern.length);
    // 분포가 센 홀 어디에도 숏게임 판정이 없다
    const counted = round.holes.filter((h) => landingHour(h.scores[ME].onGreenLanding) != null && !shortGameLandingShot(h, ME));
    expect(counted).toHaveLength(landingCounts([round]).total);
  });

  it('첫 퍼트 거리가 없어 탄착 점은 못 찍는 80m 안 샷도 분포에는 넣지 않는다 (풀샷이 아니다)', () => {
    const noPutt = approach(30, 6, { puttDetails: [] });
    expect(shortGameShots([roundOf([noPutt])]).shots).toEqual([]);
    expect(landingCounts([roundOf([noPutt])])).toMatchObject({ total: 0, shortGame: 1 });
  });
});

describe('landingSummary · quadrantOf', () => {
  it('11·12·1시는 롱, 2~4시 라이트, 5~7시 숏, 8~10시 레프트', () => {
    expect([11, 12, 1, 2, 4, 5, 7, 8, 10].map(quadrantOf)).toEqual(['long', 'long', 'long', 'right', 'right', 'short', 'short', 'left', 'left']);
  });

  it('방향별 횟수 · 가장 많은 방향 · 쏠림', () => {
    const s = landingSummary({ 6: 4, 5: 2, 12: 1 });
    expect(s).toMatchObject({ total: 7, max: 4, peakHour: 6, top: 'short', q: { short: 6, long: 1, right: 0, left: 0 } });
    expect(s.bias).toBeGreaterThan(0.5);
    expect(landingCaption(s)).toContain('평균 위치');
    expect(landingCaption(landingSummary({ 12: 1, 3: 1, 6: 1, 9: 1 }))).toBe('고르게 퍼져 있어요');
    expect(landingCaption(landingSummary({}))).toBe('');
  });
});
