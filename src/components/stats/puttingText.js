import { fmtPutt } from '../../engine/units.js';
import { MIN_ROW, MIN_COMPARE } from '../../engine/puttingDetail.js';
import { alongText, acrossText } from './shortGameText.js';

// 퍼팅 상세 분석의 한 줄 해석 — 스탯 '퍼팅' 탭과 인사이트 '퍼팅' 섹션이 같은 문장을 쓴다 (컴포넌트 파일에는 컴포넌트만 둔다).
// 판정하지 않는다: 어느 쪽이 맞는 모습인지는 말하지 않고, 내 기록의 비율 · 중앙값 · 내 기록끼리의 차이만 말한다.

// 과녁 점 색 — 로우사이드(주황) · 하이사이드(금색) · 그 밖(직선 라이 · 라이를 고르지 않은 퍼트). 어느 쪽이 좋다고 말하는 색이 아니다.
export const SIDE_COLOR = { low: '#f2895e', high: '#f3d36b', none: 'rgba(125,180,230,0.92)' };

const P = (v) => `${Math.round(v)}%`;
const M = (v) => fmtPutt(v, { digits: 1 });
const DIR_KO = { long: '롱', right: '라이트', short: '숏', left: '레프트' };

// 평균 멈춘 곳 — 5cm 안이면 "0.0m"로 쓰지 않고 말로 한다 (앞뒤는 핀하이 · 좌우는 라인 위)
export const MEAN_ZERO_M = 0.05;
export const meanAlongText = (y) => (Math.abs(y) < MEAN_ZERO_M ? '핀하이' : alongText(y));
export const meanAcrossText = (x) => (Math.abs(x) < MEAN_ZERO_M ? '라인 위' : acrossText(x));

// 거리감 — 빗나간 퍼트가 홀에 못 미쳤나 · 지나쳤나
export function paceText(pace) {
  const a = pace.all;
  if (!a.n) return null;
  const parts = [`빗나간 퍼트 ${a.n}개 중 숏 ${P(a.shortPct)} · 핀하이 ${P(a.pinHighPct)} · 롱 ${P(a.longPct)}예요.`];
  const dist = [];
  if (a.shortMedian != null && a.short >= MIN_ROW) dist.push(`홀에 못 미친 퍼트는 중앙값 ${M(a.shortMedian)} 앞에 멈췄고`);
  if (a.longMedian != null && a.long >= MIN_ROW) dist.push(`지나친 퍼트는 ${M(a.longMedian)} 너머에 멈췄어요`);
  if (dist.length === 2) parts.push(`${dist[0]}, ${dist[1]}.`);
  else if (dist.length === 1) parts.push(`${dist[0]}${dist[0].endsWith('요') ? '.' : '어요.'}`);
  // 내 기록끼리의 차이 — 경사에 따라 롱(또는 숏) 비율이 15%p 이상 달라지면 한 줄만
  const rows = pace.bySlope.filter((r) => r.n >= MIN_COMPARE);
  if (rows.length >= 2) {
    for (const [key, word] of [['longPct', '롱'], ['shortPct', '숏']]) {
      const sorted = [...rows].sort((x, y) => y[key] - x[key]);
      const hi = sorted[0], lo = sorted[sorted.length - 1];
      if (hi[key] - lo[key] >= 15) { parts.push(`${hi.label}에서는 ${word}이 ${P(hi[key])}로 ${lo.label}(${P(lo[key])})보다 많아요.`); break; }
    }
  }
  return parts.join(' ');
}

// 라인 — 좌우 · 하이/로우사이드
export function lineText(line) {
  const parts = [];
  if (line.side.n >= MIN_ROW) parts.push(`휘는 라이의 미스 ${line.side.n}개 중 로우사이드 ${P(line.side.lowPct)} · 하이사이드 ${P(line.side.highPct)}예요.`);
  const s = line.straight;
  if (s.n >= MIN_ROW) parts.push(`직선 라이의 미스 ${s.n}개는 왼쪽 ${P((s.left / s.n) * 100)} · 라인 ${P((s.line / s.n) * 100)} · 오른쪽 ${P((s.right / s.n) * 100)}예요.`);
  return parts.length ? parts.join(' ') : null;
}

// 미스 위치 과녁 — 평균 위치(쏠림)와 흩어짐
export function missMapText(p) {
  if (!p.enough || !p.mean) return null;
  const parts = [`평균 멈춘 곳은 ${meanAlongText(p.mean.y)} · ${meanAcrossText(p.mean.x)}예요.`];
  if (p.top) parts.push(`가장 많이 멈춘 쪽은 ${DIR_KO[p.top]}(${p.q[p.top]}/${p.n}개)이에요.`);
  if (p.spread?.x > 0 && p.spread?.y > 0) {
    const ratio = p.spread.y / p.spread.x;
    parts.push(ratio >= 1.3 ? `앞뒤가 좌우보다 ${ratio.toFixed(1)}배 더 흩어져요.`
      : ratio <= 1 / 1.3 ? `좌우가 앞뒤보다 ${(1 / ratio).toFixed(1)}배 더 흩어져요.`
        : '앞뒤와 좌우가 비슷하게 흩어져요.');
  }
  if (p.clear && !p.clear.x && !p.clear.y) parts.push('아직은 한쪽으로 쏠렸다고 보기 어려워요. 기록이 쌓이면 더 정확해져요.');
  return parts.join(' ');
}

// 라이별 — 성공률이 가장 높은 · 낮은 칸 (표본이 5개 이상인 칸끼리만)
export function lieText(byLie) {
  const cells = [...byLie.cells, ...byLie.compound].filter((c) => c.total >= MIN_COMPARE);
  if (cells.length < 2) return null;
  const sorted = [...cells].sort((a, b) => b.ratePct - a.ratePct || b.total - a.total);
  const hi = sorted[0], lo = sorted[sorted.length - 1];
  if (hi.ratePct === lo.ratePct) return null;
  return `성공률은 ${hi.label} ${P(hi.ratePct)}(${hi.made}/${hi.total})가 가장 높고 ${lo.label} ${P(lo.ratePct)}(${lo.made}/${lo.total})가 가장 낮아요.`;
}

// 첫 퍼트 붙이기 — 가장 많이 친 거리대 한 줄
export function lagText(lag) {
  const rows = lag.filter((r) => r.n >= MIN_COMPARE && r.within1Pct != null);
  if (!rows.length) return null;
  const r = [...rows].sort((a, b) => b.n - a.n)[0];
  const leave = r.leaveMedian != null ? ` 빗나가면 중앙값 ${M(r.leaveMedian)}가 남아요.` : '';
  return `${r.label} 첫 퍼트 ${r.n}번 중 ${P(r.within1Pct)}가 1m 안에서 끝났고 3퍼트는 ${P(r.threePuttPct)}예요.${leave}`;
}

// 무엇을 위한 퍼트인가
export function forScoreText(rows) {
  const ok = rows.filter((r) => r.total >= MIN_ROW);
  if (!ok.length) return null;
  return ok.map((r) => `${r.label} ${P(r.ratePct)}(${r.made}/${r.total})`).join(' · ') + '를 넣었어요.';
}

// 3퍼트 홀의 첫 퍼트
export function threePuttFirstText(t) {
  if (t.known < MIN_ROW) return null;
  return `3퍼트 ${t.holes}홀 중 첫 퍼트의 멈춘 곳을 기록한 ${t.known}홀은 숏 ${t.short} · 핀하이 ${t.pinHigh} · 롱 ${t.long}이었어요.`;
}
