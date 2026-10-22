import { useState } from 'react';
import { ChevronLeft, ChevronDown, History, Search } from 'lucide-react';
import styles from '../../styles/styles';
import LandingRadar from './LandingRadar';
import { landingCounts } from '../../engine/landing.js';
import ConfidenceBadge from './ConfidenceBadge';
import GreenSpeedPanel from './GreenSpeedPanel';
import InfoNote from '../ui/InfoNote';
import StickyTabs from '../ui/StickyTabs';
import { tintWash, TINT_SOFT } from '../ui/tint.js';
import { ChapterIntro, NextChapter } from './Chapter';
import { CHAPTERS } from './chapters.js';
import { ReportHeader, ReportFindings, ThreePuttCause, NextFocus, Section } from './InsightReportPanel';
import { LossShareCard, BigMissesCard, BigMissesInfo, SkillHeader, PracticeCard } from './StoryPanels';
import RoundReplayPanel from './RoundReplayPanel';
import InsightSearchPanel from './InsightSearchPanel';
import { toHoleInput, matchRoundInsightRules } from '../../engine/engine.js';
import { buildRoundMetrics } from '../../engine/metrics.js';
import { ROUND_RULES } from '../../engine/rules/roundRules.js';
import { toBreakdownInput, buildRoundBreakdown, CATEGORY_LABEL } from '../../engine/scoreBreakdown.js';
import { buildRoundDiagnosis } from '../../engine/diagnosis.js';
import { buildClubDistanceStats } from '../../engine/clubDistance.js';
import { buildTeeBias, buildApproachProximity, buildApproachProximityAll, buildPuttingStats, buildScrambling, buildGirp, buildAwfulShots } from '../../engine/shotStats.js';
import { buildGreenSpeedReport } from '../../engine/greenSpeed.js';
import { totalPar as sumPar } from '../../engine/players.js';
import { isFullRound } from '../../engine/nines.js';
import { buildInsightReport } from '../../engine/insightIndex.js';
import { buildLossShares, buildTeePenalty, buildPuttZone, buildPrescriptions } from '../../engine/roundStory.js';
import { aggregateSG, sgTier, SG_CATEGORIES, SG_LABEL } from '../../engine/strokesGained.js';
import { GIRP_STEADY_100, AWFUL_CONSISTENCY_LIMIT, AWFUL_LIMIT_SCORE_RANGE, APPROACH_125YD, DRIVER_20YD_VALUE } from '../../engine/bookBenchmarks.js';
import { rateTier, roundCountStage, estimateRoundsToSampleTarget, estimateRoundsToRateTarget } from '../../engine/stats.js';
import ExcludedNote from '../stats/ExcludedNote.jsx';

// 리포트의 장마다 탭 하나 — 장 하나가 한 페이지다. 라운드 복기·검색은 장이 아니라 헤더의 도구 버튼으로 연다.
const CHAPTER_TABS = CHAPTERS.map((c) => [c.key, c.short]);
const SUB_VIEW_TITLE = { replay: '라운드 복기', search: '검색' };

// 도구(라운드 복기 · 검색): [보기 id, 접근성 이름, 짧은 글자, 아이콘]
const TOOLS = [['replay', '라운드 복기', '복기', History], ['search', '검색', '검색', Search]];

// 마지막으로 본 장을 기억한다 — 다른 화면에 다녀와도 그 장에서 이어 보게 (앱을 닫으면 종합부터 다시)
const CHAPTER_STORE = 'bb_insights_chapter';
const savedChapter = () => {
  try {
    const v = window.sessionStorage.getItem(CHAPTER_STORE);
    if (CHAPTERS.some((c) => c.key === v)) return v;
  } catch { /* 저장소를 못 읽어도 종합부터 열면 된다 */ }
  return 'overview';
};

// 이번 라운드 ↔ 누적 전환. 범위 카드(큰 것)와 붙은 탭 아래 줄(작은 것)이 같은 모양을 쓴다.
// 지난 라운드를 보고 있으면 '이번'이 아니라 '이 라운드'.
function ScopeToggle({ rounds, isCareerMode, isLatest = true, onPick, small = false, prefix = 'scope' }) {
  return (
    <div role="group" aria-label="분석 기간" style={styles.insightsScopeToggle}>
      {[['round', isLatest ? '이번' : '이 라운드', isLatest ? '이번 라운드' : '이 라운드'], ['career', `누적 ${rounds.length}R`, `${rounds.length}라운드 누적`]].map(([k, l, full]) => {
        const on = (isCareerMode ? 'career' : 'round') === k;
        return (
          <button key={k} type="button" aria-pressed={on} aria-label={full} data-role={`${prefix}-${k}`} onClick={() => onPick(k)}
            style={{ height: small ? 30 : 36, padding: `0 ${small ? 11 : 13}px`, borderRadius: 999, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 14, fontWeight: on ? 800 : 700, background: on ? '#c9a228' : 'transparent', color: on ? '#0b0e18' : '#8896b0' }}>{l}</button>
        );
      })}
    </div>
  );
}

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

// 리포트로 볼 라운드 고르기 — 최신 라운드가 맨 위. 고른 라운드를 '이번 라운드'로 보고 그 이전 라운드까지만 쓴다.
function RoundPicker({ allRounds, pick, onPick }) {
  return (
    <div role="listbox" aria-label="리포트로 볼 라운드" data-role="round-picker"
      style={{ margin: '-4px 0 12px', maxHeight: 264, overflowY: 'auto', borderRadius: 14, background: '#0f1626', border: '1px solid #252f4a', padding: 4, textAlign: 'left' }}>
      {allRounds.map((r, i) => {
        const p = r.players[0];
        const total = r.holes.reduce((s, h) => s + (h.scores[p]?.strokes || 0), 0);
        const diff = total - sumPar(r);
        const d = new Date(r.date);
        const on = i === pick;
        return (
          <button key={r.id} type="button" role="option" aria-selected={on} data-role={`pick-${i}`} onClick={() => onPick(i)}
            style={{ width: '100%', minHeight: 48, display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: on ? 'rgba(201,162,40,0.14)' : 'transparent', color: '#e8edf8', textAlign: 'left' }}>
            <span style={{ width: 38, fontSize: 14, fontWeight: 700, color: on ? '#f3d36b' : '#8896b0', fontVariantNumeric: 'tabular-nums' }}>{d.getMonth() + 1}/{d.getDate()}</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.courseName || '코스 이름 없음'}</span>
            {i === 0 && <span style={{ fontSize: 12, fontWeight: 800, color: '#3db87a', border: '1px solid rgba(61,184,122,0.5)', borderRadius: 999, padding: '1px 7px' }}>최신</span>}
            <span style={{ fontSize: 16, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{total}</span>
            <span style={{ width: 28, fontSize: 14, fontWeight: 800, textAlign: 'right', color: diff > 0 ? '#ef5350' : diff < 0 ? '#3db87a' : '#8896b0' }}>{fmtSigned(diff, 0)}</span>
          </button>
        );
      })}
    </div>
  );
}

// 지난 라운드를 볼 때 엔진이 만든 문장 속 '이번 라운드'·'오늘'을 '이 라운드'·'그날'로 바꾼다.
// (문자열 · 배열 · 일반 객체만 따라 들어가고, 그 밖의 값은 그대로 둔다)
function swapPast(v) {
  if (typeof v === 'string') return v.replace(/이번 라운드/g, '이 라운드').replace(/오늘 /g, '그날 ');
  if (Array.isArray(v)) return v.map(swapPast);
  if (v && Object.getPrototypeOf(v) === Object.prototype) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, swapPast(x)]));
  return v;
}

export default function InsightsView({ rounds: allRounds, onBack, excludedCount = 0, nineExcludedCount = 0 }) {
  const [mode, setMode] = useState('round'); // 'round' | 'career' — §2 이번 라운드/누적 토글
  const [pickIdx, setPickIdx] = useState(0);   // 리포트로 볼 라운드 — allRounds 안의 위치 (0 = 최신)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tab, setTab] = useState('report');   // 'report' | 'replay' | 'search' — 리포트 · 라운드 복기 · 검색
  const [chapter, setChapterState] = useState(savedChapter);   // 리포트에서 열린 장(탭) — CHAPTERS 의 key
  const setChapter = (key) => {
    setChapterState(key);
    try { window.sessionStorage.setItem(CHAPTER_STORE, key); } catch { /* 저장하지 못해도 화면은 그대로 */ }
  };

  // 보기(리포트 · 복기 · 검색)를 바꾸면 새 화면의 맨 위부터 보여 준다
  const changeView = (v) => { setTab(v); window.scrollTo?.(0, 0); };

  if (allRounds.length === 0) {
    return (
      <div style={styles.container}>
        <header style={styles.pageHeader}>
          <button style={styles.iconBack} onClick={onBack}>
            <ChevronLeft size={22} />
          </button>
          <div style={styles.pageTitle}>Insights</div>
          <div style={{ width: 40 }} />
        </header>
        <ExcludedNote multiCount={excludedCount} nineCount={nineExcludedCount} margin="0 16px 12px" />
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>⚡</div>
          <div style={styles.emptyTitle}>분석할 데이터가 없습니다</div>
          <div style={styles.emptySub}>1인 라운드를 완료하면<br/>스타일 분석이 가능해요</div>
        </div>
      </div>
    );
  }

  // 라운드는 최신이 앞이다 (GolfScoringApp이 최신을 배열 앞에 붙인다). 리포트는 고른 라운드를 '지금'으로 보고
  // 그 이전 라운드만 쓴다 — slice 한 배열의 맨 앞이 고른 라운드이므로 엔진은 그대로 쓴다.
  // 이번 라운드 = 고른 라운드, 누적 = 고른 라운드와 그 이전 라운드. 복기·검색은 전체 라운드를 쓴다.
  const pick = Math.min(pickIdx, allRounds.length - 1);
  const rounds = allRounds.slice(pick);
  const isLatest = pick === 0;
  const thisRound = isLatest ? '이번 라운드' : '이 라운드';
  const localize = (v) => (isLatest ? v : swapPast(v));   // 지난 라운드면 '이번 라운드'·'오늘'을 바꿔 보인다

  const latestRound = rounds[0];   // 보고 있는 라운드 (기본은 최신)
  const player = latestRound.players[0];
  const stage = roundCountStage(rounds.length);
  const isCareerMode = mode === 'career' && rounds.length > 1;

  // ── §2A/2B: 스코어 5단계 분해 + 진단 카드 ──────────────────────────────────
  const diagnosis = localize(buildRoundDiagnosis(latestRound, player));
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
    let ob = 0, hazard = 0, unplayable = 0, threePutt = 0, onePutt = 0;
    latestRound.holes.forEach(h => {
      const s = h.scores?.[player];
      if (!s) return;
      ob += s.ob ?? 0;
      hazard += s.hazard ?? 0;
      unplayable += s.unplayable ?? 0;
      if ((s.putts ?? 2) >= 3) threePutt++;
      if ((s.putts ?? 2) === 1) onePutt++;
    });
    return { ob, hazard, unplayable, threePutt, onePutt };
  })();

  // ── 누적 전용: 홀 결과 분포 + 이벤트 (전체 라운드 합산), 라운드별 스코어 추이 ──
  const careerScoreDistribution = (() => {
    const buckets = { eagle: 0, birdie: 0, par: 0, bogey: 0, doublePlus: 0 };
    rounds.forEach(r => {
      const p = r.players[0];
      r.holes.forEach(h => {
        const d = (h.scores[p]?.strokes || 0) - h.par;
        if (d <= -2) buckets.eagle++;
        else if (d === -1) buckets.birdie++;
        else if (d === 0) buckets.par++;
        else if (d === 1) buckets.bogey++;
        else buckets.doublePlus++;
      });
    });
    return buckets;
  })();
  const careerEvents = (() => {
    let ob = 0, hazard = 0, unplayable = 0, threePutt = 0, onePutt = 0;
    rounds.forEach(r => {
      const p = r.players[0];
      r.holes.forEach(h => {
        const s = h.scores?.[p];
        if (!s) return;
        ob += s.ob ?? 0;
        hazard += s.hazard ?? 0;
        unplayable += s.unplayable ?? 0;
        if ((s.putts ?? 2) >= 3) threePutt++;
        if ((s.putts ?? 2) === 1) onePutt++;
      });
    });
    return { ob, hazard, unplayable, threePutt, onePutt };
  })();
  // 스코어 추세·평균·편차는 18홀 라운드끼리만 — 9홀 점수가 섞이면 추세·평균이 거짓이 된다.
  // 18홀 라운드가 하나도 없으면(9홀만 친 경우) 있는 라운드로 보여 준다.
  const scoreRounds = rounds.some(isFullRound) ? rounds.filter(isFullRound) : rounds;
  const roundTrend = [...scoreRounds].reverse().map((r, idx) => {
    const p = r.players[0];
    const par = sumPar(r);
    const score = r.holes.reduce((s, h) => s + (h.scores[p]?.strokes || 0), 0);
    return {
      id: r.id, roundNo: idx + 1, date: r.date,
      dateLabel: new Date(r.date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
      score, par, diff: score - par,
    };
  });
  const roundTrendMaxAbsDiff = Math.max(1, ...roundTrend.map(r => Math.abs(r.diff)));

  // ── 전체 관찰 지표 (모든 라운드 합산 — career 화면과 동일 로직 유지) ─────────
  const allHoles = rounds.flatMap(r => {
    const p = r.players[0];
    return r.holes.map(h => ({
      par: h.par,
      holeNumber: h.holeNumber,
      played: h.scores[p]?.touched !== false,   // 입력한 홀 (전반/후반 페이스 카드가 쓴다)
      strokes: h.scores[p]?.strokes || 0,
      putts: h.scores[p]?.putts || 0,
      gir: h.scores[p]?.gir,
      fairway: h.scores[p]?.fairway,
      diff: (h.scores[p]?.strokes || 0) - h.par,
    }));
  });

  // 3/4/5로 고정하면 파6·파7 홀(예: 코스 DB의 김제/정읍)이 조용히 표에서 빠지므로
  // 실제 라운드에 존재하는 파 종류를 그대로 뽑아 쓴다.
  const parTypesPresent = [...new Set(allHoles.map(h => h.par))].sort((a, b) => a - b);
  const parBreakdown = parTypesPresent.map(parNum => {
    const holes = allHoles.filter(h => h.par === parNum);
    if (holes.length === 0) return null;
    const avgStrokes = (holes.reduce((s, h) => s + h.strokes, 0) / holes.length).toFixed(2);
    const avgDiff = (holes.reduce((s, h) => s + h.diff, 0) / holes.length).toFixed(2);
    const birdieRate = ((holes.filter(h => h.diff <= -1).length / holes.length) * 100).toFixed(0);
    const bogeyPlusRate = ((holes.filter(h => h.diff >= 1).length / holes.length) * 100).toFixed(0);
    return { par: parNum, count: holes.length, avgStrokes, avgDiff, birdieRate, bogeyPlusRate };
  }).filter(Boolean);

  const scores = scoreRounds.map(r => {
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

  // ── 패턴 인사이트 (룰 엔진) — 이번 라운드는 최신 라운드만, 누적은 전체 라운드 합산 ──
  const latestRoundHoleInputs = latestRound.holes.map(h => toHoleInput(h, player));
  const roundMetrics = buildRoundMetrics(latestRoundHoleInputs);
  const roundInsights = roundMetrics ? matchRoundInsightRules(roundMetrics, ROUND_RULES) : [];

  const allHoleInputs = rounds.flatMap(r => {
    const p = r.players[0];
    return r.holes.map(h => toHoleInput(h, p));
  });
  const careerMetrics = buildRoundMetrics(allHoleInputs);
  const careerInsights = careerMetrics ? matchRoundInsightRules(careerMetrics, careerRules) : [];

  const patternInsights = localize(isCareerMode ? careerInsights : roundInsights);

  // 전반/후반 페이스는 입력한 홀만 본다 — 입력하지 않은 후반(파로 저장됨)을 '후반 강세'로 읽지 않게.
  // 한쪽이 3홀 미만이면 비교하지 않는다 (NaN → 카드를 감춘다).
  const MIN_PACE_HOLES = 3;
  const frontHoles = allHoles.filter(h => h.played && h.holeNumber <= 9);
  const backHoles = allHoles.filter(h => h.played && h.holeNumber > 9);
  const avgDiffOf = (list) => (list.length >= MIN_PACE_HOLES ? list.reduce((s, h) => s + h.diff, 0) / list.length : NaN);
  const frontAvgDiff = avgDiffOf(frontHoles);
  const backAvgDiff = avgDiffOf(backHoles);
  const fadeDiff = backAvgDiff - frontAvgDiff;

  // ── §3~5 딥다이브 통계 ───────────────────────────────────────────────────
  const teeBias = buildTeeBias(rounds);
  const teeBiasTier = teeBias.total > 0 ? rateTier(teeBias.R, teeBias.total) : null;
  const approachProximity = buildApproachProximity(rounds);
  const puttingStats = buildPuttingStats(rounds);
  const scrambling = buildScrambling(rounds);
  const clubStats = buildClubDistanceStats(rounds);

  // ── 책(Broadie) 기준 지표 — 이번 라운드/누적 토글을 따른다 ────────────────────────
  const benchRounds = isCareerMode ? rounds : [latestRound];
  const girp = buildGirp(benchRounds);
  const awful = buildAwfulShots(benchRounds);
  const awfulPoints = isCareerMode ? awful.avgPoints : awful.points;
  const awfulOverLimit = awful.avgScore != null
    && awful.avgScore >= AWFUL_LIMIT_SCORE_RANGE[0] && awful.avgScore <= AWFUL_LIMIT_SCORE_RANGE[1]
    && awfulPoints > AWFUL_CONSISTENCY_LIMIT;
  const approachAll = buildApproachProximityAll(rounds);
  // 그린 스피드별 퍼팅 — 리포트 탭과 같은 계산을 쓴다
  const greenSpeedReport = buildGreenSpeedReport(rounds, isCareerMode ? 'career' : 'round');
  // ── Strokes Gained (투어 평균 대비) — 이번 라운드 합계 / 누적은 라운드당 평균 ─────────
  const sg = aggregateSG(benchRounds);
  const sgDiv = isCareerMode ? Math.max(1, sg.rounds) : 1;
  const sgValue = (v) => v / sgDiv;
  const sgRows = [...SG_CATEGORIES, ...(sg.categories.mixed.segments > 0 ? ['mixed'] : [])]
    .map(cat => ({ cat, ...sg.categories[cat], value: sgValue(sg.categories[cat].sg) }));
  const sgMaxAbs = Math.max(0.5, ...sgRows.map(r => Math.abs(r.value)));
  const driverStat = clubStats.find(c => c.club === 'driver' && !c.subClub);

  // ── 리포트의 흐름(장)에 필요한 파생 값 ───────────────────────────────────────
  const reportMode = isCareerMode ? 'career' : 'round';
  const rep = tab === 'report' ? localize(buildInsightReport(rounds, reportMode)) : null;
  const lossShares = buildLossShares(sg);
  const teePen = buildTeePenalty(benchRounds);
  const puttZone = buildPuttZone(rounds);
  // 어프로치 표는 100야드(91m) 밖, 80m 안은 숏게임 표로 나눈다 (책의 부문 경계에 가깝게 80m에서 자른다)
  const approachRows = approachProximity.filter(b => b.n > 0 && b.id !== 'lt80');
  const approachAllRows = approachAll.filter(b => b.n > 0 && b.id !== 'lt80');
  const shortRows = [
    { key: 'hit', label: '그린 적중', ...approachProximity.find(b => b.id === 'lt80') },
    { key: 'all', label: '전체 샷', ...approachAll.find(b => b.id === 'lt80') },
  ].filter(r => r.n > 0);
  const approach110 = approachAll.find(b => b.id === '110to140')?.median ?? null;
  const prescriptions = rep
    ? buildPrescriptions({
      sg, ranked: activeBreakdown.ranked, awful, awfulOverLimit, teePen, puttZone,
      puttCauses: rep.causes, approach110, scrambling, teeBias,
    })
    : null;

  const roundPar = sumPar(latestRound);
  const roundScore = latestRound.holes.reduce((s, h) => s + (h.scores[player]?.strokes || 0), 0);

  // 범위 카드: 이번 라운드면 그 라운드의 스코어, 누적이면 평균 스코어와 파 대비 평균
  const scopeDate = `${new Date(latestRound.date).getMonth() + 1}/${new Date(latestRound.date).getDate()}`;
  const scopeDiff = isCareerMode
    ? roundTrend.reduce((s, r) => s + r.diff, 0) / roundTrend.length
    : roundScore - roundPar;

  const totalLossForBar = activeBreakdown.totalLoss;
  const barSegments = ['penalty', 'putting', 'tee', 'approach', 'shortGame']
    .map(cat => ({ cat, strokes: activeBreakdown.totals[cat] }));

  return (
    <div style={styles.container}>
      {/* 제목 줄 — 뒤로 · 제목 · 도구(라운드 복기 · 검색). 복기·검색은 리포트의 장이 아니라 따로 여는 도구다 */}
      <header style={{ ...styles.pageHeader, display: 'grid', gridTemplateColumns: '96px 1fr 96px', paddingBottom: 12 }}>
        <button style={{ ...styles.iconBack, justifySelf: 'start' }} onClick={onBack}>
          <ChevronLeft size={22} />
        </button>
        <div style={styles.pageTitle}>Insights</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          {TOOLS.map(([v, aria, text, Icon]) => {
            const on = tab === v;
            return (
              <button key={v} type="button" aria-label={aria} aria-pressed={on} data-role={`view-${v}`}
                onClick={() => changeView(on ? 'report' : v)}
                style={{ width: 46, height: 46, borderRadius: 12, background: on ? 'rgba(201,162,40,0.14)' : 'transparent', border: 'none', cursor: 'pointer', color: on ? '#f3d36b' : '#c4cfe0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, padding: 0 }}>
                <Icon size={20} strokeWidth={1.9} />
                <span style={{ fontSize: 12, fontWeight: 700, color: on ? '#f3d36b' : '#8896b0' }}>{text}</span>
              </button>
            );
          })}
        </div>
      </header>
      <ExcludedNote multiCount={excludedCount} nineCount={nineExcludedCount} margin="0 16px 12px" />

      {/* 범위 카드 — 무엇을 보고 있는지(어느 라운드의 이번 라운드 / 누적)를 한 곳에서 정한다 */}
      {tab === 'report' && (() => {
        const canPick = allRounds.length > 1;
        const body = (
          <>
            <div style={{ ...styles.insightsScopeLabel, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {isCareerMode
                  ? (isLatest ? `${rounds.length}라운드 누적 · 평균` : `${rounds.length}라운드 평균 · ${scopeDate}까지`)
                  : `${latestRound.courseName || thisRound} · ${scopeDate}`}
              </span>
              {canPick && <ChevronDown size={14} aria-hidden="true" style={{ flexShrink: 0, transform: pickerOpen ? 'rotate(180deg)' : 'none' }} />}
            </div>
            <div style={styles.insightsScopeValue}>
              <span data-role="scope-score">{isCareerMode ? avgScore.toFixed(1) : roundScore}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: scopeDiff > 0 ? '#ef5350' : scopeDiff < 0 ? '#3db87a' : '#8896b0' }}>
                {fmtSigned(scopeDiff, isCareerMode ? 1 : 0)}
              </span>
              {!isLatest && (
                <span data-role="scope-past" style={{ fontSize: 12, fontWeight: 800, color: '#c9a228', border: '1px solid rgba(201,162,40,0.5)', borderRadius: 999, padding: '1px 7px', alignSelf: 'center', whiteSpace: 'nowrap' }}>지난 라운드</span>
              )}
            </div>
          </>
        );
        return (
          <>
            <div data-role="insights-scope" style={styles.insightsScope}>
              {canPick
                ? (
                  <button type="button" data-role="scope-pick" aria-haspopup="listbox" aria-expanded={pickerOpen} aria-label="리포트로 볼 라운드 고르기"
                    onClick={() => setPickerOpen((o) => !o)}
                    style={{ flex: 1, minWidth: 0, padding: 0, background: 'none', border: 'none', color: 'inherit', textAlign: 'left', cursor: 'pointer' }}>{body}</button>
                )
                : <div style={{ flex: 1, minWidth: 0 }}>{body}</div>}
              {rounds.length > 1 && <ScopeToggle rounds={rounds} isCareerMode={isCareerMode} isLatest={isLatest} onPick={setMode} />}
            </div>
            {pickerOpen && canPick && <RoundPicker allRounds={allRounds} pick={pick} onPick={(i) => { setPickIdx(i); setPickerOpen(false); }} />}
          </>
        );
      })()}

      {/* 고정 탭 — 리포트는 장 6개가 한 줄에 다 보이는 탭(장마다 한 페이지), 복기·검색에서는 '리포트로' 돌아가는 탭.
          내려가서 위의 범위 카드·도구가 화면 밖으로 나가면, 붙은 탭 바로 아래에 같은 전환·도구를 한 줄로 다시 보여 준다 */}
      {tab === 'report'
        ? <StickyTabs variant="underline" tabs={CHAPTER_TABS} current={chapter} onChange={setChapter} label="리포트 장" rolePrefix="insights-tab"
          stuckSlot={(
            <div data-role="insights-stuck-row" style={{ display: 'flex', alignItems: 'center', justifyContent: rounds.length > 1 ? 'space-between' : 'flex-end', gap: 8, padding: '5px 16px', background: 'rgba(11,14,24,0.94)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderBottom: '1px solid #1b2238' }}>
              {rounds.length > 1 && <ScopeToggle rounds={rounds} isCareerMode={isCareerMode} isLatest={isLatest} onPick={setMode} small prefix="stuck-scope" />}
              <div style={{ display: 'flex', gap: 2 }}>
                {TOOLS.map(([v, aria, , Icon]) => (
                  <button key={v} type="button" aria-label={aria} data-role={`stuck-view-${v}`} onClick={() => changeView(v)}
                    style={{ width: 40, height: 36, borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: '#c4cfe0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                    <Icon size={19} strokeWidth={1.9} />
                  </button>
                ))}
              </div>
            </div>
          )} />
        : <StickyTabs variant="underline" tabs={[['report', '리포트'], [tab, SUB_VIEW_TITLE[tab]]]} current={tab} onChange={changeView} label="인사이트 보기" rolePrefix="insights-view" />}

      {tab === 'replay' && <div style={{ padding: '0 0 24px' }}><RoundReplayPanel rounds={allRounds} initialRoundId={latestRound.id} /></div>}
      {tab === 'search' && <div style={{ padding: '0 0 24px' }}><InsightSearchPanel rounds={allRounds} /></div>}

      {tab === 'report' && <>
      {/* ── 1장 · 종합 ─────────────────────────────────────────────── */}
      {chapter === 'overview' && <>
      <ChapterIntro no={1} past={!isLatest} />
      <ReportHeader rep={rep} past={!isLatest} />
      <ReportFindings rep={rep} />
      </>}

      {/* ── 2장 · 어디서 잃고 벌었나 — 공통 단위(타수)로 비교 ───────────────────── */}
      {chapter === 'strokes' && <>
      <ChapterIntro no={2} />
      {/* ── STROKES GAINED — 샷마다 거리·라이별 투어 평균과 비교 (Broadie 5장) ────────── */}
      {sg.holes > 0 && (
        <div style={styles.section} data-role="strokes-gained">
          <div style={styles.sectionTitle}>
            STROKES GAINED · 투어 평균 대비 {isCareerMode ? `(${rounds.length}라운드, 라운드당)` : `(${thisRound})`}
            <InfoNote title="Strokes Gained 읽는 법">
              {sg.holesWithData === 0 ? (
                <p>샷마다 남은 거리와 퍼트 거리를 입력하면 투어 평균과 비교한 Strokes Gained를 계산해 드려요. (지도로 핀과 샷 지점을 찍으면 남은 거리가 자동으로 채워져요)</p>
              ) : (
                <>
                  <p data-role="sg-coverage">
                    측정된 {sg.measuredStrokes}타 / 입력한 홀 전체 {sg.strokes}타 ({Math.round(sg.coverage * 100)}%).
                    {sg.categories.mixed.segments > 0 && ` 분류 불가 ${sg.categories.mixed.strokes}타는 남은 거리·퍼트 거리가 없어 여러 샷이 한 구간으로 묶인 값이에요.`}
                  </p>
                  <p>
                    투어 평균이 0이라 아마추어는 대부분 마이너스예요 — 숫자 크기보다 카테고리끼리의 차이를 보세요.
                    세컨샷 이후 라이는 페어웨이 O/X와 거리로 추정하고(벙커·러프 미반영), 홀 길이를 지도로 찍지 않은 par 4·5 티샷은 계산에서 빠져요.
                    20야드 안 그린 밖 샷은 20야드 기준선을 씁니다.{isCareerMode ? ' 라운드당 값은 측정되지 않은 샷이 있으면 실제보다 작게 나와요.' : ''}
                  </p>
                </>
              )}
            </InfoNote>
          </div>
          {sg.holesWithData === 0 ? (
            <div style={{ fontSize: 14, color: '#8896b0' }}>아직 계산할 수 있는 샷이 없어요.</div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 14, color: '#8896b0' }}>측정된 샷 합계</div>
                <div data-role="sg-total" style={{ fontSize: 22, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: sgValue(sg.total) >= 0 ? '#3db87a' : '#ef5350' }}>
                  {fmtSigned(sgValue(sg.total))}<span style={{ fontSize: 14, fontWeight: 700, color: '#8896b0', marginLeft: 3 }}>타{isCareerMode ? '/R' : ''}</span>
                </div>
              </div>
              {sgRows.map(r => (
                <div key={r.cat} style={styles.riStatRow} data-role={`sg-${r.cat}`}>
                  <div style={styles.riStatRowLabel}>{SG_LABEL[r.cat]}</div>
                  {/* 가운데가 0 — 오른쪽(초록)은 투어 평균보다 잘 침, 왼쪽(빨강)은 잃음 */}
                  <div style={{ ...styles.riStatRowBarTrack, position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: '#3a4e72' }} />
                    <div style={{
                      position: 'absolute', top: 0, bottom: 0,
                      [r.value >= 0 ? 'left' : 'right']: '50%',
                      width: `${Math.min(50, (Math.abs(r.value) / sgMaxAbs) * 50)}%`,
                      background: r.cat === 'mixed' ? '#6b7a99' : r.value >= 0 ? '#3db87a' : '#ef5350',
                      borderRadius: 3,
                    }} />
                  </div>
                  <div style={{ ...styles.riStatRowValue, color: r.value >= 0 ? '#3db87a' : '#ef5350' }}>{r.segments > 0 ? fmtSigned(r.value) : '–'}</div>
                  {r.segments > 0 && r.cat !== 'mixed' ? <ConfidenceBadge tier={sgTier(r.strokes)} n={r.strokes} /> : <div style={{ width: 52 }} />}
                </div>
              ))}
              {sg.coverage < 0.5 && (
                <div data-role="sg-low-coverage" style={{ fontSize: 13, color: '#6e84a8', lineHeight: 1.6, marginTop: 8 }}>
                  측정된 샷이 전체의 {Math.round(sg.coverage * 100)}%라 참고용이에요.
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 롱게임·숏게임·퍼팅이 잃은 타수에서 차지하는 비중 */}
      <LossShareCard shares={lossShares} coverage={sg.coverage} />

      {/* ── 스코어 5단계 분해 ─────────────────────────────────────────────── */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          SCORE BREAKDOWN · 스코어 기준 손실 (파 대비)
          <InfoNote title="스코어 기준 손실이란?">
            <p>위 SG와 달리 입력이 적어도 늘 계산돼요. 파를 기준으로 퍼팅 · 티샷 · 어프로치 · 숏게임 · 페널티에서 몇 타를 잃었는지 나눕니다.</p>
          </InfoNote>
        </div>

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
          <div style={{ fontSize: 14, color: '#8896b0' }}>손실 없이 파 또는 그 이상으로 마친 홀이 대부분입니다.</div>
        )}
      </div>

      {/* ── 진단 카드 (§2B, T1.5 최우선 강조) ────────────────────────────────── */}
      {!isCareerMode && diagnosis.top && (
        <div data-role="diag-card" style={{ ...styles.riDiagCard, ...tintWash(CATEGORY_COLOR[diagnosis.top.category], { base: '#1a2235', strength: 0.15 }), marginBottom: 24 }}>
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
            <div style={styles.riDiagDirective}>{withEuiGa(diagnosis.directive)} {thisRound} 스코어 손실의 핵심입니다.</div>
          )}
        </div>
      )}

      {isCareerMode && careerBreakdown.topCause && (
        <div data-role="diag-card" style={{ ...styles.riDiagCard, ...tintWash(CATEGORY_COLOR[careerBreakdown.topCause.category], { base: '#1a2235', strength: 0.15 }), marginBottom: 24 }}>
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

      </>}

      {/* ── 3장 · 빅 미스 — 나쁜 샷의 대가가 더 크다 ───────────────────────── */}
      {chapter === 'bigmiss' && <>
      <ChapterIntro no={3} />
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          BIG MISSES · 빅 미스 {isCareerMode ? `(${rounds.length}라운드 평균)` : `(${thisRound})`}
          <BigMissesInfo career={isCareerMode} awful={awful} awfulPoints={awfulPoints} teePen={teePen} />
        </div>
        <BigMissesCard
          career={isCareerMode} rounds={rounds.length}
          awful={awful} awfulPoints={awfulPoints} awfulOverLimit={awfulOverLimit}
          teePen={teePen}
          doublePlus={(isCareerMode ? careerScoreDistribution : scoreDistribution).doublePlus}
          holes={isCareerMode ? allHoles.length : timelineHoles.length}
          threePutt={(isCareerMode ? careerEvents : events).threePutt}
        />
      </div>

      </>}

      {/* ── 4장 · 부문별 진단 — 티샷 → 어프로치 → 숏게임 → 퍼팅 ───────────────────── */}
      {chapter === 'skills' && <>
      <ChapterIntro no={4} />

      {/* ── 티샷 (드라이빙) ─────────────────────────────────────────────── */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          TEE · 티샷
          <InfoNote title="티샷 읽는 법">
            <p>티샷은 정확도보다 거리가 스코어에 더 크게 기여하는 경향이 있어요 (아주 좁은 코스는 예외). 티샷 OB율은 위 3장에 있어요.</p>
            {driverStat && driverStat.n >= 5 && (
              <p data-role="driver-value">
                드라이버를 {DRIVER_20YD_VALUE.meters.toFixed(0)}m(20야드) 더 보내면 라운드당 투어 약 {DRIVER_20YD_VALUE.tour}타,
                90타 골퍼 약 {DRIVER_20YD_VALUE.golfer90}타, 100타 골퍼 약 {DRIVER_20YD_VALUE.golfer100}타를 아낍니다.
                내 드라이버 중앙값은 {driverStat.median?.toFixed(0)}m예요.
              </p>
            )}
          </InfoNote>
        </div>
        <SkillHeader cat="tee" sg={sg} career={isCareerMode} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#e8edf8' }}>
            좌 <span style={{ fontWeight: 800 }}>{teeBias.L}</span> · 중 <span style={{ fontWeight: 800 }}>{teeBias.C}</span> · 우 <span style={{ fontWeight: 800 }}>{teeBias.R}</span>
            {teeBias.G > 0 && <> · 1온 <span style={{ fontWeight: 800 }}>{teeBias.G}</span></>}
          </div>
          {teeBiasTier && <ConfidenceBadge tier={teeBiasTier} n={teeBias.total} />}
        </div>
        {teeBias.total > 0 ? (
          <div style={{ fontSize: 14, color: '#8896b0', lineHeight: 1.6 }}>
            편향지수 {fmtSigned(teeBias.biasIndex)} ({teeBias.biasIndex > 0.15 ? '우측 경향' : teeBias.biasIndex < -0.15 ? '좌측 경향' : '중립'}) — 최근 10라운드 기준
          </div>
        ) : (
          <div style={{ fontSize: 14, color: '#8896b0' }}>페어웨이 랜딩 기록이 아직 없습니다.</div>
        )}
      </div>

      {/* ── 어프로치 — 100야드(약 91m) 밖 샷 ─────────────────────────────────── */}
      <div style={styles.section} data-role="approach-section">
        <div style={styles.sectionTitle}>APPROACH · 어프로치</div>
        <SkillHeader cat="approach" sg={sg} career={isCareerMode} />
        {girp.holes > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: 14, color: '#8896b0' }}>
                GIRP · 규정 타수+1타 이내 그린 도달 {isCareerMode ? '(라운드 평균)' : ''}
                <InfoNote title="GIRP란?">
                  <p>프린지는 따로 기록하지 않아 그린만 셉니다. 라운드당 {GIRP_STEADY_100}개 이상이면 꾸준히 100타를 깨는 수준이라고 해요.</p>
                  {!isCareerMode && girp.holes < 18 && <p>{`입력한 ${girp.holes}홀 기준, 18홀로 환산하면 ${girp.per18.toFixed(1)}개예요.`}</p>}
                </InfoNote>
              </div>
              <div data-role="girp-value" style={{ fontSize: 18, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: girp.per18 >= GIRP_STEADY_100 ? '#3db87a' : '#e8edf8' }}>
                {isCareerMode ? `${girp.per18.toFixed(1)}/18` : `${girp.girp}/${girp.holes}`}
              </div>
            </div>
          </div>
        )}
        {stage >= 3 && approachRows.length > 0 && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#8ca4bc', marginBottom: 6 }}>거리구간별 근접도 — 그린에 올린 샷의 첫 퍼트 거리 (최근 20R)</div>
            {approachRows.map(b => (
              <div key={b.id} style={styles.riStatRow}>
                <div style={styles.riStatRowLabel}>{b.label}</div>
                <div style={styles.riStatRowBarTrack}>
                  <div style={{ ...styles.riStatRowBarFill, width: `${Math.min(100, (b.median / 15) * 100)}%` }} />
                </div>
                <div style={styles.riStatRowValue}>{b.median?.toFixed(1)}m</div>
                <ConfidenceBadge tier={b.tier} n={b.n} />
              </div>
            ))}
          </div>
        )}
        {stage >= 3 && approachRows.length === 0 && (
          <div style={{ fontSize: 14, color: '#8896b0' }}>거리구간별 데이터가 아직 없습니다.</div>
        )}

        {/* 위 근접도는 그린에 올린 샷만 센다. 그린을 놓친 샷까지 센 같은 기준으로 한 번 더 — 그래야 투어·90타 골퍼와 견줄 수 있다. */}
        {stage >= 3 && approachAllRows.length > 0 && (
          <div style={{ marginTop: 14 }} data-role="approach-all">
            <div style={{ fontSize: 13, fontWeight: 700, color: '#8ca4bc', marginBottom: 6 }}>
              전체 샷 기준 — 그린을 놓친 샷 포함 (샷 뒤 핀까지 남은 거리)
              <InfoNote title="전체 샷 기준 비교">
                <p>125야드({APPROACH_125YD.distanceM.toFixed(0)}m)에서 절반의 샷이 들어오는 거리: 투어 {APPROACH_125YD.tourMedianM.toFixed(1)}m · 90타 골퍼 {APPROACH_125YD.golfer90MedianM.toFixed(1)}m예요.</p>
                <p>110-140m 구간과 비교해 보세요. par 3 티샷은 포함되지 않고, 남은 거리는 입력한 값 기준이에요.</p>
              </InfoNote>
            </div>
            {approachAllRows.map(b => (
              <div key={b.id} style={styles.riStatRow}>
                <div style={styles.riStatRowLabel}>{b.label}</div>
                <div style={styles.riStatRowBarTrack}>
                  <div style={{ ...styles.riStatRowBarFill, width: `${Math.min(100, (b.median / 25) * 100)}%` }} />
                </div>
                <div style={styles.riStatRowValue}>{b.median?.toFixed(1)}m</div>
                <ConfidenceBadge tier={b.tier} n={b.n} />
              </div>
            ))}
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
        const { counts, total } = landingCounts(rounds);
        if (total === 0) return null;
        return (
          <div style={styles.section} data-role="landing-section">
            <div style={styles.sectionTitle}>GREEN APPROACH · 그린 랜딩 분포</div>
            <LandingRadar counts={counts} />
            <div style={{ textAlign: 'center', color: '#6b6558', fontSize: 14, marginTop: 8 }}>총 {total}회 기록</div>
          </div>
        );
      })()}

      {/* ── 숏게임 — 그린 밖 100야드(약 91m) 안 샷 ──────────────────────────── */}
      <div style={styles.section} data-role="shortgame-section">
        <div style={styles.sectionTitle}>SHORT GAME · 숏게임</div>
        <SkillHeader cat="shortGame" sg={sg} career={isCareerMode} />
        {scrambling.attempts > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 14, color: '#8896b0' }}>
              스크램블링 (그린 미스 후 파 세이브) <span style={{ color: '#e8edf8', fontWeight: 700 }}>{scrambling.ratePct.toFixed(0)}%</span>
              <span style={{ marginLeft: 6, color: '#6e84a8' }}>({scrambling.saves}/{scrambling.attempts}홀)</span>
            </div>
            <ConfidenceBadge tier={scrambling.tier} n={scrambling.attempts} />
          </div>
        ) : (
          <div style={{ fontSize: 14, color: '#8896b0', marginBottom: 10 }}>그린을 놓친 홀이 아직 없어요.</div>
        )}
        {stage >= 3 && shortRows.length > 0 && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#8ca4bc', marginBottom: 6 }}>
              80m 안 샷의 근접도
              <InfoNote title="근접도 두 줄의 차이">
                <p>첫 줄은 그린에 올린 샷의 첫 퍼트 거리, 둘째 줄은 그린을 놓친 샷까지 센 샷 뒤 핀까지 남은 거리예요.</p>
              </InfoNote>
            </div>
            {shortRows.map(r => (
              <div key={r.key} style={styles.riStatRow}>
                <div style={styles.riStatRowLabel}>{r.label}</div>
                <div style={styles.riStatRowBarTrack}>
                  <div style={{ ...styles.riStatRowBarFill, width: `${Math.min(100, (r.median / 15) * 100)}%` }} />
                </div>
                <div style={styles.riStatRowValue}>{r.median?.toFixed(1)}m</div>
                <ConfidenceBadge tier={r.tier} n={r.n} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 퍼팅 — 그린 위의 샷 ───────────────────────────────────────────── */}
      <div style={styles.section} data-role="putting-section">
        <div style={styles.sectionTitle}>
          PUTTING · 퍼팅
          <InfoNote title="퍼트 수 읽는 법">
            <p>퍼트 수는 첫 퍼트 거리와 함께 봐야 해요 — 60피트(18m)에서 2퍼트는 잘한 것이고 2피트(0.6m)에서 2퍼트는 실수지만 둘 다 '2퍼트'로 세어지거든요. 위 SG가 그 거리를 반영한 값이에요.</p>
          </InfoNote>
        </div>
        <SkillHeader cat="putting" sg={sg} career={isCareerMode} />
        <div style={{ fontSize: 13, fontWeight: 700, color: '#8ca4bc', marginBottom: 6 }}>거리구간별 성공률 (커리어 누적)</div>
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
          <div style={{ fontSize: 14, color: '#8896b0' }}>퍼팅 상세 기록이 아직 없습니다.</div>
        )}
        {puttZone.total >= 3 && (
          <div style={{ fontSize: 14, color: '#b4c0d8', lineHeight: 1.6, marginTop: 10 }} data-role="putt-zone">
            퍼팅 실력이 가장 많이 갈리는 <b>1~2m(3~7피트)</b> 구간 성공률 <b style={{ color: '#e8edf8' }}>{Math.round(puttZone.ratePct)}%</b> ({puttZone.made}/{puttZone.total}).
            <InfoNote title="1~2m 구간이 중요한 이유">
              <p>최상위 퍼터는 전체 이득의 38%를, 아마추어는 프로에게 잃는 타수의 46%를 이 구간에서 얻고 잃어요.</p>
            </InfoNote>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <ThreePuttCause rep={rep} />
        </div>

        {/* 그날의 그린 스피드에 따른 퍼팅 — 이번 라운드 / 누적 토글에 연동 */}
        {greenSpeedReport && (
          <div style={{ marginTop: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#8ca4bc', letterSpacing: '0.16em', marginBottom: 8 }}>
              GREEN SPEED · 그린 스피드{isCareerMode ? ' (구간별 라운드 평균)' : ''}
            </div>
            <GreenSpeedPanel report={greenSpeedReport} past={!isLatest} />
          </div>
        )}
      </div>

      </>}

      {/* ── 5장 · 다음 라운드 — 무엇을 연습할까 ───────────────────────────────── */}
      {chapter === 'next' && <>
      <ChapterIntro no={5} />
      <NextFocus rep={rep} />
      <Section title="PRACTICE · 연습 처방">
        <PracticeCard prescriptions={prescriptions} />
      </Section>

      </>}

      {/* ── 6장 · 기록으로 보기 — 참고 자료 ─────────────────────────────────── */}
      {chapter === 'records' && <>
      <ChapterIntro no={6} />

      {/* ── 홀 결과 분포 + 이벤트 하이라이트 (이번 라운드 / 누적 분리) ──────────── */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          HOLE RESULTS · {isCareerMode ? `${rounds.length}라운드 누적 홀 결과` : `${thisRound} 홀 결과`}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {[
            ['이글+', (isCareerMode ? careerScoreDistribution : scoreDistribution).eagle, '#c9a228'],
            ['버디', (isCareerMode ? careerScoreDistribution : scoreDistribution).birdie, '#3db87a'],
            ['파', (isCareerMode ? careerScoreDistribution : scoreDistribution).par, '#8896b0'],
            ['보기', (isCareerMode ? careerScoreDistribution : scoreDistribution).bogey, '#e57373'],
            ['더블+', (isCareerMode ? careerScoreDistribution : scoreDistribution).doublePlus, '#ef5350'],
          ].map(([label, count, color]) => (
            <div key={label} style={{ flex: '1 0 18%', textAlign: 'center', padding: '10px 4px', background: '#111827', border: '1px solid #1b2238', borderRadius: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{count}</div>
              <div style={{ fontSize: 12, color: '#8896b0', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(isCareerMode ? careerEvents : events).ob > 0 && <span style={styles.riSubTabBtn}>OB {(isCareerMode ? careerEvents : events).ob}회</span>}
          {(isCareerMode ? careerEvents : events).hazard > 0 && <span style={styles.riSubTabBtn}>해저드 {(isCareerMode ? careerEvents : events).hazard}회</span>}
          {(isCareerMode ? careerEvents : events).unplayable > 0 && <span style={styles.riSubTabBtn}>언플레이어블 {(isCareerMode ? careerEvents : events).unplayable}회</span>}
          {(isCareerMode ? careerEvents : events).threePutt > 0 && <span style={styles.riSubTabBtn}>3퍼트+ {(isCareerMode ? careerEvents : events).threePutt}회</span>}
          {(isCareerMode ? careerEvents : events).onePutt > 0 && <span style={styles.riSubTabBtn}>1퍼트 {(isCareerMode ? careerEvents : events).onePutt}회</span>}
        </div>
      </div>

      {/* ── 이번 라운드: 홀 타임라인 / 누적: 라운드별 스코어 추이 ────────────── */}
      {isCareerMode ? (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>ROUND TREND · 라운드별 스코어 추이</div>
          {roundTrend.map(r => (
            <div key={r.id} style={styles.riStatRow}>
              <div style={styles.riStatRowLabel}>{r.dateLabel}</div>
              <div style={styles.riStatRowBarTrack}>
                <div
                  style={{
                    ...styles.riStatRowBarFill,
                    width: `${(Math.abs(r.diff) / roundTrendMaxAbsDiff) * 100}%`,
                    marginLeft: r.diff < 0 ? 'auto' : 0,
                    background: r.diff > 0 ? '#ef5350' : r.diff < 0 ? '#3db87a' : '#8896b0',
                  }}
                />
              </div>
              <div style={styles.riStatRowValue}>{r.score} <span style={{ color: r.diff > 0 ? '#ef5350' : r.diff < 0 ? '#3db87a' : '#8896b0' }}>{r.diff === 0 ? 'E' : fmtSigned(r.diff, 0)}</span></div>
            </div>
          ))}
        </div>
      ) : (
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
      )}

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

      {/* ── 반복 패턴 (룰 엔진) — 이번 라운드/누적 토글에 연동 ─────────────────── */}
      {isCareerMode && patternInsights.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            PATTERN INSIGHTS · {isCareerMode ? `${rounds.length}라운드 누적 반복 패턴 분석` : `${thisRound} 반복 패턴 분석`}
          </div>
          <div style={styles.insightCards}>
            {patternInsights.map((ins, i) => {
              const color = SEVERITY_COLOR[ins.severity] ?? '#8896b0';
              const bg    = SEVERITY_BG[ins.severity]    ?? 'rgba(136,150,176,0.10)';
              const badge = SEVERITY_BADGE[ins.severity] ?? '·';
              return (
                <div key={i} style={{ ...styles.insightCard, ...tintWash(color, TINT_SOFT) }}>
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
      </>}

      {/* 페이지 끝에서 다음 장으로 — 종합 → 타수 득실 → 빅 미스 … 순서로 이어 읽는다 */}
      <NextChapter current={chapter} onGo={setChapter} />
      </>}
    </div>
  );
}
