import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import styles from '../../styles/styles';
import GreenMissSelector from '../scoring/GreenMissSelector';
import ConfidenceBadge from './ConfidenceBadge';
import { toHoleInput, matchRoundInsightRules } from '../../engine/engine.js';
import { buildRoundMetrics } from '../../engine/metrics.js';
import { ROUND_RULES } from '../../engine/rules/roundRules.js';
import { toBreakdownInput, buildRoundBreakdown, CATEGORY_LABEL } from '../../engine/scoreBreakdown.js';
import { buildRoundDiagnosis } from '../../engine/diagnosis.js';
import { buildClubDistanceStats } from '../../engine/clubDistance.js';
import { buildTeeBias, buildApproachProximity, buildPuttingStats, buildScrambling } from '../../engine/shotStats.js';
import { rateTier, roundCountStage, estimateRoundsToSampleTarget, estimateRoundsToRateTarget } from '../../engine/stats.js';

const SEVERITY_COLOR = { positive: '#3db87a', neutral: '#8896b0', warning: '#c9a228', critical: '#ef5350' };
const SEVERITY_BG    = { positive: 'rgba(61,184,122,0.12)', neutral: 'rgba(136,150,176,0.10)', warning: 'rgba(201,162,40,0.12)', critical: 'rgba(239,83,80,0.12)' };
const SEVERITY_BADGE = { positive: '✓', neutral: '·', warning: '△', critical: '!' };

// 스코어 5단계 분해 카테고리별 색 — success(green)/danger(red) 이분법과 겹치지 않도록
// penalty만 위험 신호로 red를 재사용하고 나머지는 중립 카테고리 팔레트를 쓴다.
const CATEGORY_COLOR = {
  penalty:   '#ef5350',
  putting:   '#c9a228',
  tee:       '#6b8cae',
  approach:  '#8a6fb0',
  shortGame: '#d98e3e',
};

const careerRules = ROUND_RULES.filter(r => r.careerApplicable !== false);

function fmtSigned(n, digits = 2) {
  const v = Number(n);
  return (v > 0 ? '+' : '') + v.toFixed(digits);
}

// 한글 종성 유무에 따라 이/가 조사를 고른다 ("컨트롤이" vs "마무리가").
function withEuiGa(word) {
  const last = word[word.length - 1];
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return `${word}이`;
  const hasFinal = (code - 0xac00) % 28 !== 0;
  return hasFinal ? `${word}이` : `${word}가`;
}

// 온그린 랜딩(1~12시)을 GreenMissSelector가 쓰는 4분면으로 변환.
function clockToQuadrant(clock) {
  if (clock == null) return null;
  if (clock >= 11 || clock <= 1) return 'long';
  if (clock >= 2 && clock <= 4) return 'right';
  if (clock >= 5 && clock <= 7) return 'short';
  return 'left';
}

export default function InsightsView({ rounds, onBack }) {
  const [mode, setMode] = useState('round'); // 'round' | 'career' — §2 이번 라운드/누적 토글

  if (rounds.length === 0) {
    return (
      <div style={styles.container}>
        <header style={styles.pageHeader}>
          <button style={styles.iconBack} onClick={onBack}>
            <ChevronLeft size={22} />
          </button>
          <div style={styles.pageTitle}>Insights</div>
          <div style={{ width: 40 }} />
        </header>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>⚡</div>
          <div style={styles.emptyTitle}>분석할 데이터가 없습니다</div>
          <div style={styles.emptySub}>1인 라운드를 완료하면<br/>스타일 분석이 가능해요</div>
        </div>
      </div>
    );
  }

  // rounds[0] = 최신 라운드 (GolfScoringApp이 최신을 배열 앞에 붙인다)
  const latestRound = rounds[0];
  const player = latestRound.players[0];
  const stage = roundCountStage(rounds.length);
  const isCareerMode = mode === 'career' && rounds.length > 1;

  // ── §2A/2B: 스코어 5단계 분해 + 진단 카드 ──────────────────────────────────
  const diagnosis = buildRoundDiagnosis(latestRound, player);
  const careerBreakdown = isCareerMode
    ? buildRoundBreakdown(rounds.flatMap(r => r.holes.map(h => toBreakdownInput(h, r.players[0]))))
    : null;
  const activeBreakdown = isCareerMode ? careerBreakdown : diagnosis.breakdown;

  // ── §2C/2D/§6: 홀 결과 분포 · 이벤트 · 타임라인 (표시 대상 라운드 = 이번 라운드 고정) ──
  const timelineHoles = diagnosis.breakdown.holes;
  const scoreDistribution = (() => {
    const buckets = { eagle: 0, birdie: 0, par: 0, bogey: 0, doublePlus: 0 };
    timelineHoles.forEach(h => {
      const d = h.holeLoss;
      if (d <= -2) buckets.eagle++;
      else if (d === -1) buckets.birdie++;
      else if (d === 0) buckets.par++;
      else if (d === 1) buckets.bogey++;
      else buckets.doublePlus++;
    });
    return buckets;
  })();
  const events = (() => {
    let ob = 0, hazard = 0, threePutt = 0, onePutt = 0;
    latestRound.holes.forEach(h => {
      const s = h.scores?.[player];
      if (!s) return;
      ob += s.ob ?? 0;
      hazard += s.hazard ?? 0;
      if ((s.putts ?? 2) >= 3) threePutt++;
      if ((s.putts ?? 2) === 1) onePutt++;
    });
    return { ob, hazard, threePutt, onePutt };
  })();

  // ── 전체 관찰 지표 (모든 라운드 합산 — career 화면과 동일 로직 유지) ─────────
  const allHoles = rounds.flatMap(r => {
    const p = r.players[0];
    return r.holes.map(h => ({
      par: h.par,
      strokes: h.scores[p]?.strokes || 0,
      putts: h.scores[p]?.putts || 0,
      gir: h.scores[p]?.gir,
      fairway: h.scores[p]?.fairway,
      diff: (h.scores[p]?.strokes || 0) - h.par,
    }));
  });

  const parBreakdown = [3, 4, 5].map(parNum => {
    const holes = allHoles.filter(h => h.par === parNum);
    if (holes.length === 0) return null;
    const avgStrokes = (holes.reduce((s, h) => s + h.strokes, 0) / holes.length).toFixed(2);
    const avgDiff = (holes.reduce((s, h) => s + h.diff, 0) / holes.length).toFixed(2);
    const birdieRate = ((holes.filter(h => h.diff <= -1).length / holes.length) * 100).toFixed(0);
    const bogeyPlusRate = ((holes.filter(h => h.diff >= 1).length / holes.length) * 100).toFixed(0);
    return { par: parNum, count: holes.length, avgStrokes, avgDiff, birdieRate, bogeyPlusRate };
  }).filter(Boolean);

  const scores = rounds.map(r => {
    const p = r.players[0];
    return r.holes.reduce((s, h) => s + (h.scores[p]?.strokes || 0), 0);
  });
  const avgScore = scores.reduce((s, v) => s + v, 0) / scores.length;
  const variance = scores.reduce((s, v) => s + Math.pow(v - avgScore, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  const birdieCount = allHoles.filter(h => h.diff <= -1).length;
  const doublePlusCount = allHoles.filter(h => h.diff >= 2).length;
  const parCount = allHoles.filter(h => h.diff === 0).length;
  const birdieRatePct = (birdieCount / allHoles.length) * 100;
  const doubleRatePct = (doublePlusCount / allHoles.length) * 100;
  const parRatePct = (parCount / allHoles.length) * 100;

  let styleType, styleSubtitle, styleDescription, styleIcon, styleColor;
  if (birdieRatePct >= 10 && doubleRatePct >= 15) {
    styleType = '공격형 · AGGRESSIVE'; styleSubtitle = '리스크를 감수하는 스코어 메이커';
    styleDescription = '버디 찬스를 적극적으로 노리지만 때때로 큰 실수가 발생합니다. 빅 스코어가 나올 수 있는 스타일이에요.';
    styleIcon = '🔥'; styleColor = '#c04a3e';
  } else if (doubleRatePct < 10 && birdieRatePct < 8) {
    styleType = '안정형 · CONSERVATIVE'; styleSubtitle = '실수 없는 꾸준한 스코어 관리';
    styleDescription = '큰 실수가 적고 안정적으로 파와 보기 사이에서 스코어를 관리합니다. 꾸준함이 무기예요.';
    styleIcon = '🛡️'; styleColor = '#3db87a';
  } else if (parRatePct >= 35) {
    styleType = '정교형 · PRECISION'; styleSubtitle = '파 세이브 능력이 뛰어난 플레이어';
    styleDescription = '파 세이브율이 높아 안정적인 스코어를 만들어냅니다. 정확한 샷메이킹이 강점입니다.';
    styleIcon = '🎯'; styleColor = '#e8edf8';
  } else if (stdDev >= 6) {
    styleType = '기복형 · INCONSISTENT'; styleSubtitle = '라운드마다 스코어 편차가 큰 스타일';
    styleDescription = `라운드별 편차 ±${stdDev.toFixed(1)}타 — 좋을 땐 환상적이지만 컨디션에 좌우됩니다.`;
    styleIcon = '⚡'; styleColor = '#c9a228';
  } else {
    styleType = '밸런스형 · BALANCED'; styleSubtitle = '공격과 수비의 균형이 잡힌 플레이어';
    styleDescription = '공격적인 플레이와 안정적인 관리를 적절히 섞는 스타일입니다.';
    styleIcon = '⚖️'; styleColor = '#e8edf8';
  }

  // ── 커리어 패턴 인사이트 (룰 엔진) ──────────────────────────────────────────
  const allHoleInputs = rounds.flatMap(r => {
    const p = r.players[0];
    return r.holes.map(h => toHoleInput(h, p));
  });
  const careerMetrics = buildRoundMetrics(allHoleInputs);
  const careerInsights = careerMetrics ? matchRoundInsightRules(careerMetrics, careerRules) : [];

  const frontHoles = allHoles.filter((_, idx) => idx % 18 < 9);
  const backHoles = allHoles.filter((_, idx) => idx % 18 >= 9);
  const frontAvgDiff = frontHoles.reduce((s, h) => s + h.diff, 0) / frontHoles.length;
  const backAvgDiff = backHoles.reduce((s, h) => s + h.diff, 0) / backHoles.length;
  const fadeDiff = backAvgDiff - frontAvgDiff;

  // ── §3~5 딥다이브 통계 ───────────────────────────────────────────────────
  const teeBias = buildTeeBias(rounds);
  const teeBiasTier = teeBias.total > 0 ? rateTier(teeBias.R, teeBias.total) : null;
  const approachProximity = buildApproachProximity(rounds);
  const puttingStats = buildPuttingStats(rounds);
  const scrambling = buildScrambling(rounds);
  const clubStats = buildClubDistanceStats(rounds);

  const roundPar = latestRound.pars.reduce((a, b) => a + b, 0);
  const roundScore = latestRound.holes.reduce((s, h) => s + (h.scores[player]?.strokes || 0), 0);

  const totalLossForBar = activeBreakdown.totalLoss;
  const barSegments = ['penalty', 'putting', 'tee', 'approach', 'shortGame']
    .map(cat => ({ cat, strokes: activeBreakdown.totals[cat] }));

  return (
    <div style={styles.container}>
      <header style={styles.pageHeader}>
        <button style={styles.iconBack} onClick={onBack}>
          <ChevronLeft size={22} />
        </button>
        <div style={styles.pageTitle}>Insights</div>
        <div style={{ width: 40 }} />
      </header>

      <div style={styles.insightsBanner}>
        <div style={styles.insightsBannerLabel}>{latestRound.courseName || '이번 라운드'}</div>
        <div style={styles.insightsBannerValue}>
          <span>{roundScore}</span>
          <span style={{ ...styles.insightsBannerSub, color: roundScore - roundPar > 0 ? '#ef5350' : roundScore - roundPar < 0 ? '#3db87a' : '#8896b0' }}>
            {fmtSigned(roundScore - roundPar, 0)}
          </span>
          <span style={styles.insightsBannerDot}>·</span>
          <span>{rounds.length}</span>
          <span style={styles.insightsBannerSub}>라운드 누적</span>
        </div>
      </div>

      {rounds.length > 1 && (
        <div style={styles.riToggleRow}>
          <button
            style={{ ...styles.riToggleBtn, ...(mode === 'round' ? styles.riToggleBtnActive : {}) }}
            onClick={() => setMode('round')}
          >이번 라운드</button>
          <button
            style={{ ...styles.riToggleBtn, ...(mode === 'career' ? styles.riToggleBtnActive : {}) }}
            onClick={() => setMode('career')}
          >누적 ({rounds.length}R)</button>
        </div>
      )}

      {/* ── 스코어 5단계 분해 ─────────────────────────────────────────────── */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>SCORE BREAKDOWN · 스코어 분해</div>

        {totalLossForBar > 0 ? (
          <>
            <div style={styles.riStatBarTrack}>
              {barSegments.filter(s => s.strokes > 0).map(s => (
                <div
                  key={s.cat}
                  style={{ ...styles.riStatBarSeg, width: `${(s.strokes / totalLossForBar) * 100}%`, background: CATEGORY_COLOR[s.cat] }}
                />
              ))}
            </div>
            <div style={styles.riLegendGrid}>
              {barSegments.filter(s => s.strokes > 0).map(s => (
                <div key={s.cat} style={styles.riLegendItem}>
                  <span style={{ ...styles.riLegendDot, background: CATEGORY_COLOR[s.cat] }} />
                  {CATEGORY_LABEL[s.cat]} <span style={styles.riLegendValue}>{s.strokes}타</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: '#8896b0' }}>손실 없이 파 또는 그 이상으로 마친 홀이 대부분입니다.</div>
        )}
      </div>

      {/* ── 진단 카드 (§2B, T1.5 최우선 강조) ────────────────────────────────── */}
      {!isCareerMode && diagnosis.top && (
        <div style={{ ...styles.riDiagCard, marginBottom: 24 }}>
          <div style={{ ...styles.riDiagCardAccent, background: CATEGORY_COLOR[diagnosis.top.category] }} />
          <div style={styles.riDiagHead}>
            <div>
              <div style={styles.riDiagLabel}>가장 많이 잃은 곳</div>
              <div style={{ ...styles.riDiagCause, color: CATEGORY_COLOR[diagnosis.top.category] }}>
                {diagnosis.top.label} {diagnosis.top.strokes}타
              </div>
            </div>
            <div style={styles.riDiagPct}>전체 손실의 {diagnosis.top.pct.toFixed(0)}%</div>
          </div>
          <div style={styles.riDiagRow}>
            <span style={styles.riDiagRowLabel}>관찰</span>
            <span>{diagnosis.observation}</span>
          </div>
          {diagnosis.directive && (
            <div style={styles.riDiagDirective}>{withEuiGa(diagnosis.directive)} 이번 라운드 스코어 손실의 핵심입니다.</div>
          )}
        </div>
      )}

      {isCareerMode && careerBreakdown.topCause && (
        <div style={{ ...styles.riDiagCard, marginBottom: 24 }}>
          <div style={{ ...styles.riDiagCardAccent, background: CATEGORY_COLOR[careerBreakdown.topCause.category] }} />
          <div style={styles.riDiagHead}>
            <div>
              <div style={styles.riDiagLabel}>누적 · 가장 많이 잃은 곳</div>
              <div style={{ ...styles.riDiagCause, color: CATEGORY_COLOR[careerBreakdown.topCause.category] }}>
                {careerBreakdown.topCause.label} {careerBreakdown.topCause.strokes}타
              </div>
            </div>
            <div style={styles.riDiagPct}>전체 손실의 {careerBreakdown.topCause.pct.toFixed(0)}%</div>
          </div>
          <div style={styles.riDiagRow}>
            <span style={styles.riDiagRowLabel}>관찰</span>
            <span>{rounds.length}라운드 동안 {careerBreakdown.topCause.holeCount}개 홀에서 손실이 발생했습니다.</span>
          </div>
        </div>
      )}

      {/* ── 홀 결과 분포 + 이벤트 하이라이트 ─────────────────────────────────── */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>HOLE RESULTS · 이번 라운드 홀 결과</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {[
            ['이글+', scoreDistribution.eagle, '#c9a228'],
            ['버디', scoreDistribution.birdie, '#3db87a'],
            ['파', scoreDistribution.par, '#8896b0'],
            ['보기', scoreDistribution.bogey, '#e57373'],
            ['더블+', scoreDistribution.doublePlus, '#ef5350'],
          ].map(([label, count, color]) => (
            <div key={label} style={{ flex: '1 0 18%', textAlign: 'center', padding: '10px 4px', background: '#111827', border: '1px solid #1b2238', borderRadius: 6 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{count}</div>
              <div style={{ fontSize: 10, color: '#8896b0', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {events.ob > 0 && <span style={styles.riSubTabBtn}>OB {events.ob}회</span>}
          {events.hazard > 0 && <span style={styles.riSubTabBtn}>해저드 {events.hazard}회</span>}
          {events.threePutt > 0 && <span style={styles.riSubTabBtn}>3퍼트+ {events.threePutt}회</span>}
          {events.onePutt > 0 && <span style={styles.riSubTabBtn}>1퍼트 {events.onePutt}회</span>}
        </div>
      </div>

      {/* ── 홀 타임라인 (§6) ──────────────────────────────────────────────── */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>HOLE TIMELINE · 홀별 원인</div>
        <div style={styles.riTimelineWrap}>
          {timelineHoles.map(h => (
            <div key={h.holeNumber} style={{ ...styles.riTimelineCell, borderTopColor: h.primaryCause ? CATEGORY_COLOR[h.primaryCause] : '#1b2238' }}>
              <div style={styles.riTimelineHole}>{h.holeNumber}</div>
              <div style={styles.riTimelineScore}>{h.score}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MY STYLE ─────────────────────────────────────────────────────── */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>MY STYLE · 나의 플레이 스타일</div>
        <div style={{ ...styles.styleCard, borderColor: styleColor }}>
          <div style={styles.styleIconWrap}>
            <div style={styles.styleIconEmoji}>{styleIcon}</div>
          </div>
          <div style={styles.styleContent}>
            <div style={{ ...styles.styleType, color: styleColor }}>{styleType}</div>
            <div style={styles.styleSubtitle}>{styleSubtitle}</div>
            <div style={styles.styleDescription}>{styleDescription}</div>
          </div>
        </div>
        <div style={styles.styleMetrics}>
          <div style={styles.styleMetric}>
            <div style={styles.styleMetricLabel}>버디율</div>
            <div style={styles.styleMetricValue}>{birdieRatePct.toFixed(1)}%</div>
          </div>
          <div style={styles.styleMetricDivider} />
          <div style={styles.styleMetric}>
            <div style={styles.styleMetricLabel}>파 세이브</div>
            <div style={styles.styleMetricValue}>{parRatePct.toFixed(0)}%</div>
          </div>
          <div style={styles.styleMetricDivider} />
          <div style={styles.styleMetric}>
            <div style={styles.styleMetricLabel}>더블+ 비율</div>
            <div style={styles.styleMetricValue}>{doubleRatePct.toFixed(1)}%</div>
          </div>
          <div style={styles.styleMetricDivider} />
          <div style={styles.styleMetric}>
            <div style={styles.styleMetricLabel}>일관성</div>
            <div style={styles.styleMetricValue}>±{stdDev.toFixed(1)}</div>
          </div>
        </div>
      </div>

      {/* ── 티샷 딥다이브 (§3) ────────────────────────────────────────────── */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>TEE · 티샷</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 13, color: '#e8edf8' }}>
            좌 <span style={{ fontWeight: 800 }}>{teeBias.L}</span> · 중 <span style={{ fontWeight: 800 }}>{teeBias.C}</span> · 우 <span style={{ fontWeight: 800 }}>{teeBias.R}</span>
            {teeBias.G > 0 && <> · 1온 <span style={{ fontWeight: 800 }}>{teeBias.G}</span></>}
          </div>
          {teeBiasTier && <ConfidenceBadge tier={teeBiasTier} n={teeBias.total} />}
        </div>
        {teeBias.total > 0 ? (
          <div style={{ fontSize: 12, color: '#8896b0', lineHeight: 1.6 }}>
            편향지수 {fmtSigned(teeBias.biasIndex)} ({teeBias.biasIndex > 0.15 ? '우측 경향' : teeBias.biasIndex < -0.15 ? '좌측 경향' : '중립'}) — 최근 10라운드 기준
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#8896b0' }}>페어웨이 랜딩 기록이 아직 없습니다.</div>
        )}
      </div>

      {/* ── 어프로치 딥다이브 (§4) ────────────────────────────────────────── */}
      {stage >= 3 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>APPROACH · 어프로치 (거리구간별 근접도, 최근 20R)</div>
          {approachProximity.filter(b => b.n > 0).map(b => (
            <div key={b.id} style={styles.riStatRow}>
              <div style={styles.riStatRowLabel}>{b.label}</div>
              <div style={styles.riStatRowBarTrack}>
                <div style={{ ...styles.riStatRowBarFill, width: `${Math.min(100, (b.median / 15) * 100)}%` }} />
              </div>
              <div style={styles.riStatRowValue}>{b.median?.toFixed(1)}m</div>
              <ConfidenceBadge tier={b.tier} n={b.n} />
            </div>
          ))}
          {approachProximity.every(b => b.n === 0) && (
            <div style={{ fontSize: 12, color: '#8896b0' }}>거리구간별 데이터가 아직 없습니다.</div>
          )}
        </div>
      )}

      {/* ── 퍼팅 딥다이브 (§5) ────────────────────────────────────────────── */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>PUTTING · 퍼팅 성공률 (거리구간, 커리어 누적)</div>
        {puttingStats.byDistance.filter(b => b.total > 0).map(b => (
          <div key={b.id} style={styles.riStatRow}>
            <div style={styles.riStatRowLabel}>{b.label}</div>
            <div style={styles.riStatRowBarTrack}>
              <div style={{ ...styles.riStatRowBarFill, width: `${b.ratePct ?? 0}%`, background: '#3db87a' }} />
            </div>
            <div style={styles.riStatRowValue}>{b.ratePct?.toFixed(0)}%</div>
            <ConfidenceBadge tier={b.tier} n={b.total} />
          </div>
        ))}
        {puttingStats.byDistance.every(b => b.total === 0) && (
          <div style={{ fontSize: 12, color: '#8896b0' }}>퍼팅 상세 기록이 아직 없습니다.</div>
        )}

        {scrambling.attempts > 0 && (
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, color: '#8896b0' }}>
              스크램블링 (그린 미스 후 파 세이브) <span style={{ color: '#e8edf8', fontWeight: 700 }}>{scrambling.ratePct.toFixed(0)}%</span>
            </div>
            <ConfidenceBadge tier={scrambling.tier} n={scrambling.attempts} />
          </div>
        )}
      </div>

      {/* ── 클럽 거리 (§3-1, 10라운드+ 부터) ─────────────────────────────────── */}
      {stage >= 4 && clubStats.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>CLUB DISTANCE · 클럽별 거리 (최근 20R)</div>
          {clubStats.map(c => (
            <div key={c.label} style={styles.riStatRow}>
              <div style={styles.riStatRowLabel}>{c.label}</div>
              <div style={styles.riStatRowBarTrack}>
                <div style={{ ...styles.riStatRowBarFill, width: `${Math.min(100, (c.median / 200) * 100)}%` }} />
              </div>
              <div style={styles.riStatRowValue}>{c.median?.toFixed(0)}m</div>
              <ConfidenceBadge tier={c.tier} n={c.n} />
            </div>
          ))}
        </div>
      )}

      {/* ── 온그린 랜딩 분포 ─────────────────────────────────────────────── */}
      {(() => {
        const counts = { long: 0, short: 0, left: 0, right: 0 };
        let total = 0;
        rounds.forEach(r => {
          const p = r.players[0];
          r.holes.forEach(h => {
            const q = clockToQuadrant(h.scores?.[p]?.onGreenLanding);
            if (q) { counts[q]++; total++; }
          });
        });
        if (total === 0) return null;
        return (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>GREEN APPROACH · 그린 랜딩 분포</div>
            <GreenMissSelector stats={{ ...counts, total }} />
            <div style={{ textAlign: 'center', color: '#6b6558', fontSize: 12, marginTop: 8 }}>총 {total}회 기록</div>
          </div>
        );
      })()}

      {/* ── 반복 패턴 (룰 엔진) ──────────────────────────────────────────── */}
      {careerInsights.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>PATTERN INSIGHTS · 반복 패턴 분석</div>
          <div style={styles.insightCards}>
            {careerInsights.map((ins, i) => {
              const color = SEVERITY_COLOR[ins.severity] ?? '#8896b0';
              const bg    = SEVERITY_BG[ins.severity]    ?? 'rgba(136,150,176,0.10)';
              const badge = SEVERITY_BADGE[ins.severity] ?? '·';
              return (
                <div key={i} style={{ ...styles.insightCard, borderLeftColor: color }}>
                  <div style={{ ...styles.insightCardBadge, background: bg, color }}>{badge}</div>
                  <div style={styles.insightCardContent}>
                    <div style={styles.insightCardTitle}>{ins.title}</div>
                    <div style={styles.insightCardDetail}>{ins.summary}</div>
                    <div style={{ ...styles.insightCardDetail, color: '#888', marginTop: 3 }}>{ins.recommendation}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 파별 성적 ────────────────────────────────────────────────────── */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>BY PAR · 파별 성적</div>
        <div style={styles.parAnalysis}>
          {parBreakdown.map(p => (
            <div key={p.par} style={styles.parAnalysisRow}>
              <div style={styles.parAnalysisBadge}>PAR {p.par}</div>
              <div style={styles.parAnalysisData}>
                <div style={styles.parAnalysisMain}>
                  <span style={styles.parAnalysisStrokes}>{p.avgStrokes}</span>
                  <span style={{ ...styles.parAnalysisDiff, color: parseFloat(p.avgDiff) > 0 ? '#ef5350' : parseFloat(p.avgDiff) < 0 ? '#3db87a' : '#8896b0' }}>
                    {parseFloat(p.avgDiff) > 0 ? '+' : ''}{p.avgDiff}
                  </span>
                  <span style={styles.parAnalysisCount}>({p.count}홀)</span>
                </div>
                <div style={styles.parAnalysisRates}>
                  <span>버디+ {p.birdieRate}%</span>
                  <span style={styles.parAnalysisDot}>·</span>
                  <span>보기+ {p.bogeyPlusRate}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 전후반 페이스 ────────────────────────────────────────────────── */}
      {!isNaN(fadeDiff) && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>PACE · 전후반 페이스</div>
          <div style={styles.paceCard}>
            <div style={styles.paceRow}>
              <div style={styles.paceLabel}>FRONT 9</div>
              <div style={styles.paceValue}>{fmtSigned(frontAvgDiff)}<span style={styles.paceSub}>/홀</span></div>
            </div>
            <div style={styles.paceArrow}>{Math.abs(fadeDiff) < 0.1 ? '→' : fadeDiff > 0 ? '↗' : '↘'}</div>
            <div style={styles.paceRow}>
              <div style={styles.paceLabel}>BACK 9</div>
              <div style={styles.paceValue}>{fmtSigned(backAvgDiff)}<span style={styles.paceSub}>/홀</span></div>
            </div>
          </div>
          <div style={styles.paceInsight}>
            {Math.abs(fadeDiff) < 0.1
              ? '전후반 페이스가 균일합니다 — 집중력 유지가 좋아요'
              : fadeDiff > 0.3
                ? `후반에 평균 ${fadeDiff.toFixed(2)}타 더 많이 쳐요 — 체력/집중력 관리 필요`
                : fadeDiff < -0.3
                  ? `후반에 ${Math.abs(fadeDiff).toFixed(2)}타 적게 쳐요 — 후반 집중력이 강점`
                  : '전후반이 안정적으로 유지됩니다'}
          </div>
        </div>
      )}

      {/* ── 데이터 성장 현황판 (§7) ──────────────────────────────────────── */}
      {stage < 4 && (() => {
        const clubTarget = estimateRoundsToSampleTarget(clubStats.reduce((s, c) => s + c.n, 0), rounds.length, 15 * Math.max(1, clubStats.length));
        const teeTarget = estimateRoundsToRateTarget(teeBias.R, teeBias.total, Math.min(rounds.length, 10), 20);
        const items = [];
        if (teeTarget != null && teeTarget > 0) items.push(`티샷 편향 지표 신뢰도 확보까지 약 ${teeTarget}라운드`);
        if (clubTarget != null && clubTarget > 0) items.push(`클럽별 거리 통계까지 약 ${clubTarget}라운드`);
        if (stage < 3) items.push(`경사·거리구간 경향 분석까지 ${Math.max(0, 5 - rounds.length)}라운드`);
        if (stage < 4) items.push(`클럽 거리 매트릭스 확정까지 ${Math.max(0, 10 - rounds.length)}라운드`);
        if (items.length === 0) return null;
        return (
          <div style={styles.section}>
            <div style={styles.riGrowthBanner}>
              <div style={styles.riGrowthTitle}>DATA GROWTH · 더 쌓이면 보이는 것들</div>
              {items.map((t, i) => <div key={i}>· {t}</div>)}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
