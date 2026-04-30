import React from 'react';
import { ChevronLeft } from 'lucide-react';
import styles from '../../styles/styles';
import GreenMissSelector from '../scoring/GreenMissSelector';
import { toHoleInput, matchRoundInsightRules } from '../../engine/engine.js';
import { buildRoundMetrics } from '../../engine/metrics.js';
import { ROUND_RULES } from '../../engine/rules/roundRules.js';

const SEVERITY_COLOR  = { positive: '#1f5e3a', neutral: '#6b6558', warning: '#d97706', critical: '#c04a3e' };
const SEVERITY_BG     = { positive: '#e8f5eb', neutral: '#f5f0e6', warning: '#fef3c7', critical: '#fde8e3' };
const SEVERITY_BADGE  = { positive: '✓', neutral: '·', warning: '△', critical: '!' };

const careerRules = ROUND_RULES.filter(r => r.careerApplicable !== false);

export default function InsightsView({ rounds, onBack }) {
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
          <div style={styles.emptyTitle}>분석할 데이터가 부족합니다</div>
          <div style={styles.emptySub}>라운드를 3회 이상 기록하면<br/>스타일 분석이 가능해요</div>
        </div>
      </div>
    );
  }

  const allHoles = rounds.flatMap(r => {
    const p = r.players[0];
    return r.holes.map(h => ({
      par: h.par,
      strokes: h.scores[p]?.strokes || 0,
      putts: h.scores[p]?.putts || 0,
      gir: h.scores[p]?.gir,
      fairway: h.scores[p]?.fairway,
      greenMiss: h.scores[p]?.greenMiss,
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

  const totalGir = allHoles.filter(h => h.gir === true).length;
  const girRate = (totalGir / allHoles.length) * 100;
  const par4or5 = allHoles.filter(h => h.par > 3);
  const fairwayHit = par4or5.filter(h => h.fairway === true).length;
  const fairwayRate = par4or5.length > 0 ? (fairwayHit / par4or5.length) * 100 : 0;
  const avgPutts = allHoles.reduce((s, h) => s + h.putts, 0) / allHoles.length;

  const birdieCount = allHoles.filter(h => h.diff <= -1).length;
  const doublePlusCount = allHoles.filter(h => h.diff >= 2).length;
  const parCount = allHoles.filter(h => h.diff === 0).length;
  const birdieRatePct = (birdieCount / allHoles.length) * 100;
  const doubleRatePct = (doublePlusCount / allHoles.length) * 100;
  const parRatePct = (parCount / allHoles.length) * 100;

  const scores = rounds.map(r => {
    const p = r.players[0];
    return r.holes.reduce((s, h) => s + (h.scores[p]?.strokes || 0), 0);
  });
  const avgScore = scores.reduce((s, v) => s + v, 0) / scores.length;
  const variance = scores.reduce((s, v) => s + Math.pow(v - avgScore, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  let styleType, styleSubtitle, styleDescription, styleIcon, styleColor;

  if (birdieRatePct >= 10 && doubleRatePct >= 15) {
    styleType = '공격형 · AGGRESSIVE';
    styleSubtitle = '리스크를 감수하는 스코어 메이커';
    styleDescription = '버디 찬스를 적극적으로 노리지만 때때로 큰 실수가 발생합니다. 빅 스코어가 나올 수 있는 스타일이에요.';
    styleIcon = '🔥';
    styleColor = '#c04a3e';
  } else if (doubleRatePct < 10 && birdieRatePct < 8) {
    styleType = '안정형 · CONSERVATIVE';
    styleSubtitle = '실수 없는 꾸준한 스코어 관리';
    styleDescription = '큰 실수가 적고 안정적으로 파와 보기 사이에서 스코어를 관리합니다. 꾸준함이 무기예요.';
    styleIcon = '🛡️';
    styleColor = '#1f5e3a';
  } else if (parRatePct >= 35) {
    styleType = '정교형 · PRECISION';
    styleSubtitle = '파 세이브 능력이 뛰어난 플레이어';
    styleDescription = '파 세이브율이 높아 안정적인 스코어를 만들어냅니다. 정확한 샷메이킹이 강점입니다.';
    styleIcon = '🎯';
    styleColor = '#1f3d2e';
  } else if (stdDev >= 6) {
    styleType = '기복형 · INCONSISTENT';
    styleSubtitle = '라운드마다 스코어 편차가 큰 스타일';
    styleDescription = `라운드별 편차 ±${stdDev.toFixed(1)}타 — 좋을 땐 환상적이지만 컨디션에 좌우됩니다. 꾸준함이 과제예요.`;
    styleIcon = '⚡';
    styleColor = '#d9a441';
  } else {
    styleType = '밸런스형 · BALANCED';
    styleSubtitle = '공격과 수비의 균형이 잡힌 플레이어';
    styleDescription = '공격적인 플레이와 안정적인 관리를 적절히 섞는 스타일입니다. 전천후 골퍼예요.';
    styleIcon = '⚖️';
    styleColor = '#1f3d2e';
  }

  const strengths = [];
  const weaknesses = [];

  if (girRate >= 50) strengths.push({ title: '견고한 아이언', detail: `GIR ${girRate.toFixed(0)}% — 그린 적중률이 우수합니다` });
  else if (girRate < 30) weaknesses.push({ title: '아이언 정확도', detail: `GIR ${girRate.toFixed(0)}% — 어프로치 연습 권장` });

  if (fairwayRate >= 55) strengths.push({ title: '안정적인 티샷', detail: `페어웨이 ${fairwayRate.toFixed(0)}% — 스윙 일관성이 좋습니다` });
  else if (fairwayRate < 35) weaknesses.push({ title: '티샷 방향성', detail: `페어웨이 ${fairwayRate.toFixed(0)}% — 드라이버 정확도 개선 필요` });

  if (avgPutts <= 1.8) strengths.push({ title: '우수한 퍼팅', detail: `홀당 ${avgPutts.toFixed(2)} 퍼팅 — 그린 감각 탁월` });
  else if (avgPutts >= 2.2) weaknesses.push({ title: '퍼팅 효율', detail: `홀당 ${avgPutts.toFixed(2)} 퍼팅 — 퍼팅 연습이 가장 큰 스코어 개선 포인트` });

  const weakestPar = parBreakdown.reduce((w, p) =>
    (!w || parseFloat(p.avgDiff) > parseFloat(w.avgDiff)) ? p : w, null);
  if (weakestPar && parseFloat(weakestPar.avgDiff) > 0.5) {
    weaknesses.push({
      title: `파${weakestPar.par} 홀 공략`,
      detail: `평균 +${weakestPar.avgDiff}타 — 파${weakestPar.par} 홀에서 스코어 손실이 큼`
    });
  }

  const bestPar = parBreakdown.reduce((b, p) =>
    (!b || parseFloat(p.avgDiff) < parseFloat(b.avgDiff)) ? p : b, null);
  if (bestPar && parseFloat(bestPar.avgDiff) < 0.3) {
    strengths.push({
      title: `파${bestPar.par}에 강함`,
      detail: `평균 +${bestPar.avgDiff}타 — 파${bestPar.par} 홀에서 안정적`
    });
  }

  const greenMissStats = (() => {
    const counts = { long: 0, short: 0, left: 0, right: 0 };
    let total = 0;
    allHoles.forEach(h => {
      if (h.greenMiss && counts[h.greenMiss] !== undefined) {
        counts[h.greenMiss]++;
        total++;
      }
    });
    return { ...counts, total };
  })();

  // 커리어 인사이트 (엔진 기반)
  const allHoleInputs = rounds.flatMap(r => {
    const p = r.players[0];
    return r.holes.map(h => toHoleInput(h, p));
  });
  const careerMetrics = buildRoundMetrics(allHoleInputs);
  const careerInsights = careerMetrics
    ? matchRoundInsightRules(careerMetrics, careerRules)
    : [];

  const frontHoles = allHoles.filter((_, idx) => idx % 18 < 9);
  const backHoles = allHoles.filter((_, idx) => idx % 18 >= 9);
  const frontAvgDiff = frontHoles.reduce((s, h) => s + h.diff, 0) / frontHoles.length;
  const backAvgDiff = backHoles.reduce((s, h) => s + h.diff, 0) / backHoles.length;
  const fadeDiff = backAvgDiff - frontAvgDiff;

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
        <div style={styles.insightsBannerLabel}>전체 분석 데이터</div>
        <div style={styles.insightsBannerValue}>
          <span>{rounds.length}</span>
          <span style={styles.insightsBannerSub}>라운드</span>
          <span style={styles.insightsBannerDot}>·</span>
          <span>{allHoles.length}</span>
          <span style={styles.insightsBannerSub}>홀</span>
        </div>
      </div>

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

      {strengths.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>STRENGTHS · 강점</div>
          <div style={styles.insightCards}>
            {strengths.map((s, i) => (
              <div key={i} style={{ ...styles.insightCard, borderLeftColor: '#1f5e3a' }}>
                <div style={styles.insightCardBadge}>✓</div>
                <div style={styles.insightCardContent}>
                  <div style={styles.insightCardTitle}>{s.title}</div>
                  <div style={styles.insightCardDetail}>{s.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {weaknesses.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>FOCUS AREAS · 개선 포인트</div>
          <div style={styles.insightCards}>
            {weaknesses.map((w, i) => (
              <div key={i} style={{ ...styles.insightCard, borderLeftColor: '#c04a3e' }}>
                <div style={{ ...styles.insightCardBadge, background: '#fde8e3', color: '#c04a3e' }}>△</div>
                <div style={styles.insightCardContent}>
                  <div style={styles.insightCardTitle}>{w.title}</div>
                  <div style={styles.insightCardDetail}>{w.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {careerInsights.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>PATTERN INSIGHTS · 반복 패턴 분석</div>
          <div style={styles.insightCards}>
            {careerInsights.map((ins, i) => {
              const color = SEVERITY_COLOR[ins.severity] ?? '#6b6558';
              const bg    = SEVERITY_BG[ins.severity]    ?? '#f5f0e6';
              const badge = SEVERITY_BADGE[ins.severity] ?? '·';
              return (
                <div key={i} style={{ ...styles.insightCard, borderLeftColor: color }}>
                  <div style={{ ...styles.insightCardBadge, background: bg, color }}>
                    {badge}
                  </div>
                  <div style={styles.insightCardContent}>
                    <div style={styles.insightCardTitle}>{ins.title}</div>
                    <div style={styles.insightCardDetail}>{ins.summary}</div>
                    <div style={{ ...styles.insightCardDetail, color: '#888', marginTop: 3 }}>
                      {ins.recommendation}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={styles.section}>
        <div style={styles.sectionTitle}>BY PAR · 파별 성적</div>
        <div style={styles.parAnalysis}>
          {parBreakdown.map(p => (
            <div key={p.par} style={styles.parAnalysisRow}>
              <div style={styles.parAnalysisBadge}>PAR {p.par}</div>
              <div style={styles.parAnalysisData}>
                <div style={styles.parAnalysisMain}>
                  <span style={styles.parAnalysisStrokes}>{p.avgStrokes}</span>
                  <span style={{
                    ...styles.parAnalysisDiff,
                    color: parseFloat(p.avgDiff) > 0 ? '#c04a3e' : parseFloat(p.avgDiff) < 0 ? '#1f5e3a' : '#6b6558',
                  }}>
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

      {greenMissStats.total > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>GREEN APPROACH · 그린 방향 분석</div>
          <GreenMissSelector stats={greenMissStats} />
          <div style={{ textAlign: 'center', color: '#6b6558', fontSize: '12px', marginTop: 8 }}>
            총 {greenMissStats.total}회 기록
          </div>
        </div>
      )}

      {!isNaN(fadeDiff) && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>PACE · 전후반 페이스</div>
          <div style={styles.paceCard}>
            <div style={styles.paceRow}>
              <div style={styles.paceLabel}>FRONT 9</div>
              <div style={styles.paceValue}>
                {frontAvgDiff > 0 ? '+' : ''}{frontAvgDiff.toFixed(2)}
                <span style={styles.paceSub}>/홀</span>
              </div>
            </div>
            <div style={styles.paceArrow}>
              {Math.abs(fadeDiff) < 0.1 ? '→' : fadeDiff > 0 ? '↗' : '↘'}
            </div>
            <div style={styles.paceRow}>
              <div style={styles.paceLabel}>BACK 9</div>
              <div style={styles.paceValue}>
                {backAvgDiff > 0 ? '+' : ''}{backAvgDiff.toFixed(2)}
                <span style={styles.paceSub}>/홀</span>
              </div>
            </div>
          </div>
          <div style={styles.paceInsight}>
            {Math.abs(fadeDiff) < 0.1
              ? '전후반 페이스가 균일합니다 — 집중력 유지가 좋아요'
              : fadeDiff > 0.3
                ? `후반에 평균 ${fadeDiff.toFixed(2)}타 더 많이 쳐요 — 체력/집중력 관리 필요`
                : fadeDiff < -0.3
                  ? `후반에 ${Math.abs(fadeDiff).toFixed(2)}타 적게 쳐요 — 후반 집중력이 강점`
                  : '전후반이 안정적으로 유지됩니다'
            }
          </div>
        </div>
      )}
    </div>
  );
}
