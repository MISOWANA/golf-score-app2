import { describe, it, expect } from 'vitest';
import { paceText, lineText, missMapText, lieText, lagText, forScoreText, threePuttFirstText, meanAlongText, meanAcrossText } from './puttingText.js';
import { buildPuttingDetail } from '../../engine/puttingDetail.js';
import { sampleRounds, roundOf, holeOf, made, missed } from '../../test/putts.js';

// 퍼팅 상세 분석의 한 줄 해석 — 내 기록의 비율 · 중앙값 · 내 기록끼리의 차이만 말하고 판정하지 않는다

const d = buildPuttingDetail(sampleRounds());

describe('거리감 문장', () => {
  it('숏 · 핀하이 · 롱 비율과 못 미친 · 지나친 거리의 중앙값을 말한다', () => {
    const t = paceText(d.pace);
    expect(t).toMatch(/^빗나간 퍼트 \d+개 중 숏 \d+% · 핀하이 \d+% · 롱 \d+%예요\./);
    expect(t).toContain('홀에 못 미친 퍼트는 중앙값');
    expect(t).toContain('지나친 퍼트는');
  });

  it('경사에 따라 롱 비율이 15%p 이상 다르면 그 차이를 한 줄로 말한다 (내리막은 롱, 오르막은 숏)', () => {
    const t = paceText(d.pace);
    expect(t).toMatch(/내리막에서는 롱이 \d+%로 오르막\(\d+%\)보다 많아요\./);
  });

  it('기록이 없으면 말하지 않는다', () => {
    expect(paceText(buildPuttingDetail([]).pace)).toBeNull();
  });

  it('판정하는 말(좋다 · 나쁘다 · 해야 한다)이 들어 있지 않다', () => {
    const all = [paceText(d.pace), lineText(d.line), missMapText(d.missMap.all), lieText(d.byLie), lagText(d.lag), forScoreText(d.forScore)].filter(Boolean).join(' ');
    expect(all).not.toMatch(/좋은|나쁜|잘못|해야|필요해요|연습/);
  });
});

describe('라인 문장', () => {
  it('휘는 라이는 하이/로우사이드, 직선 라이는 좌우 비율', () => {
    const t = lineText(d.line);
    expect(t).toMatch(/휘는 라이의 미스 8개 중 로우사이드 \d+% · 하이사이드 \d+%예요\./);
    expect(t).toMatch(/직선 라이의 미스 13개는 왼쪽 8% · 라인 77% · 오른쪽 15%예요\./);                  // 평지 · 오르막 · 내리막 직선 합계
  });

  it('표본이 3개 미만이면 말하지 않는다', () => {
    expect(lineText(buildPuttingDetail([roundOf([holeOf([missed(4, 'flat', 0.3, -0.5), made(0.3)])])]).line)).toBeNull();
  });
});

describe('미스 위치 문장', () => {
  it('평균 멈춘 곳 · 가장 많이 멈춘 쪽 · 흩어짐을 말한다', () => {
    const t = missMapText(d.missMap.all);
    expect(t).toMatch(/^평균 멈춘 곳은 (숏|롱|핀하이)/);
    expect(t).toMatch(/흩어져요/);
  });

  it('가장 많이 멈춘 쪽은 한 쪽이 앞설 때만 말한다 (같은 횟수로 갈리면 말하지 않는다)', () => {
    const shorts = [-0.5, -0.7, -0.6, -0.4, -0.8, -0.55].map((y, i) => holeOf([missed(4, 'flat', 0.05, y), made(0.3)], { number: i + 1 }));
    expect(missMapText(buildPuttingDetail([roundOf(shorts)]).missMap.all)).toMatch(/가장 많이 멈춘 쪽은 숏\(6\/6개\)이에요/);
    expect(missMapText(d.missMap.all)).not.toMatch(/가장 많이 멈춘 쪽은/);              // 샘플은 롱 · 숏이 같은 횟수다
  });

  it('표본이 모자라면 말하지 않는다', () => {
    expect(missMapText(buildPuttingDetail([roundOf([holeOf([missed(4, 'flat', 0.3, -0.5), made(0.3)])])]).missMap.all)).toBeNull();
  });

  it('평균이 5cm 안이면 "0.0m" 대신 말로 한다 (핀하이 · 라인 위)', () => {
    expect(meanAlongText(0.02)).toBe('핀하이');
    expect(meanAlongText(-0.04)).toBe('핀하이');
    expect(meanAcrossText(0.01)).toBe('라인 위');
    expect(meanAlongText(-0.5)).toMatch(/^숏 /);
    expect(meanAcrossText(0.5)).toMatch(/^라이트 /);
  });
});

describe('라이 · 첫 퍼트 · 무엇을 위한 퍼트', () => {
  it('성공률이 가장 높은 · 낮은 라이 (표본 5개 이상인 칸끼리만)', () => {
    const rs = [];
    const add = (lie, ok, n) => { for (let i = 0; i < n; i++) rs.push(holeOf([ok > i ? made(2, lie) : missed(2, lie, 0, -0.3), made(0.3)], { number: rs.length + 1 })); };
    add('flat', 8, 10); add('uphill', 2, 6); add('downhill', 9, 9); add('break-left', 1, 3);       // 슬라이스는 3개뿐이라 비교에서 빠진다
    const t = lieText(buildPuttingDetail([roundOf(rs)]).byLie);
    expect(t).toContain('다운힐'.length ? '내리막' : '');
    expect(t).toMatch(/가장 높고 오르막 .*가장 낮아요/);
    expect(t).not.toContain('슬라이스');
  });

  it('칸이 하나뿐이거나 성공률이 같으면 말하지 않는다', () => {
    expect(lieText({ cells: [{ id: 'flat', label: '평지', made: 3, total: 6, ratePct: 50 }], compound: [] })).toBeNull();
    expect(lieText({ cells: [{ id: 'flat', label: '평지', made: 3, total: 6, ratePct: 50 }, { id: 'uphill', label: '오르막', made: 5, total: 10, ratePct: 50 }], compound: [] })).toBeNull();
  });

  it('첫 퍼트 붙이기 — 가장 많이 친 거리대 한 줄', () => {
    const rows = [
      { id: 'a', label: '3-6m', n: 20, within1Pct: 80, threePuttPct: 5, leaveMedian: 0.6 },
      { id: 'b', label: '6-10m', n: 8, within1Pct: 50, threePuttPct: 12, leaveMedian: 1.1 },
    ];
    expect(lagText(rows)).toBe('3-6m 첫 퍼트 20번 중 80%가 1m 안에서 끝났고 3퍼트는 5%예요. 빗나가면 중앙값 0.6m가 남아요.');
    expect(lagText([{ id: 'c', label: '~3m', n: 3, within1Pct: 100 }])).toBeNull();           // 5번 미만
  });

  it('무엇을 위한 퍼트인가', () => {
    expect(forScoreText([{ id: 'birdie', label: '버디 퍼트', made: 2, total: 10, ratePct: 20 }, { id: 'par', label: '파 퍼트', made: 9, total: 12, ratePct: 75 }]))
      .toBe('버디 퍼트 20%(2/10) · 파 퍼트 75%(9/12)를 넣었어요.');
    expect(forScoreText([{ id: 'birdie', label: '버디 퍼트', made: 0, total: 2, ratePct: 0 }])).toBeNull();
  });

  it('3퍼트 홀의 첫 퍼트는 3홀 이상 기록했을 때만', () => {
    expect(threePuttFirstText({ holes: 4, known: 2, short: 1, long: 1, pinHigh: 0 })).toBeNull();
    expect(threePuttFirstText({ holes: 8, known: 5, short: 3, long: 1, pinHigh: 1 })).toBe('3퍼트 8홀 중 첫 퍼트의 멈춘 곳을 기록한 5홀은 숏 3 · 핀하이 1 · 롱 1이었어요.');
  });
});
