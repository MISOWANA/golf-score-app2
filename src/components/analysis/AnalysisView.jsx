import { useState, useMemo } from 'react';
import { ChevronLeft, Home, BookOpen, Edit3, X, Calendar, MapPin, User } from 'lucide-react';
import styles from '../../styles/styles';
import ParTable from '../ui/ParTable';
import StatTile from './StatTile';
import BreakdownBar from './BreakdownBar';
import ScorecardTable from './ScorecardTable';
import Insights from './Insights';
import HoleReview from './HoleReview';
import HoleReviewGrid from './HoleReviewGrid';
import RoundCard from './RoundCard';
import { buildRoundCard } from '../../engine/roundCard.js';
import { evaluateGoal, goalProgress, FOCUS_METRIC, MAX_GOALS } from '../../engine/goals.js';
import { buildRoundRecords } from '../../engine/records.js';
import { shareOrDownload } from '../../platform/shareFile.js';
import { buildReportImageModel, reportImageFileName } from '../../share/reportImageModel.js';
import { offGreenShots } from '../../engine/offGreen.js';
import GreenSpeedPicker from '../common/GreenSpeedPicker';
import { validSpeed } from '../../engine/greenSpeed.js';
import { summarizeRound } from '../../engine/roundSummary.js';
import { applyParEdit } from '../../engine/parEdit.js';
import { localNoonISO } from '../../engine/roundDate.js';
import { ninesOf, holeNoOf, isNineHoleRound, roundKindLabel } from '../../engine/nines.js';
import { localizeDeep } from '../../engine/units.js';

// historyRounds: 요약 카드가 "내 평균과 비교"할 때 쓰는 라운드들 (통계에 들어가는 라운드)
//   goals · onOpenGoal  정해 둔 목표(이 라운드로 판정해 카드에 보여 준다)와 목표 시트 열기 — onOpenGoal({ metric })
//   allRounds · userName  개인 기록(베스트 스코어 등)을 견줄 모든 라운드와 "나"의 이름
export default function AnalysisView({ round: initialRound, historyRounds = [], allRounds = [], userName, goals = [], onOpenGoal, onBack, onGoHome, onGoHistory, onNewRound, onUpdateRound }) {
  const [round, setRound] = useState(initialRound);
  const [activePlayer, setActivePlayer] = useState(initialRound?.players[0]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDraft, setEditDraft] = useState(null);
  const [editError, setEditError] = useState(null);
  // 홀별 복기 — 스코어카드에서 홀 번호를 누르면 열린다.
  const [reviewHoleIdx, setReviewHoleIdx] = useState(null);
  // 리포트 이미지 저장·공유 상태: null | 'working' | 'shared' | 'downloaded' | 'error'
  const [shareState, setShareState] = useState(null);

  // 맨 위 라운드 요약 카드 — 라운드가 바뀌면(점수·파 수정) 다시 만든다. 동반자 라운드는 카드가 없다.
  const card = useMemo(() => (round ? localizeDeep(buildRoundCard(round, historyRounds)) : null), [round, historyRounds]);

  // 정해 둔 목표를 이 라운드로 판정한 결과, 그리고 포커스를 목표로 정하는 버튼에 쓸 지표
  const goalResults = useMemo(
    () => (card?.eligible ? goals.map((g) => ({ goal: g, ev: evaluateGoal(g, round), progress: goalProgress(g, historyRounds) })) : []),
    [card, goals, round, historyRounds],
  );
  // 이 라운드가 깬 개인 기록 — 이 라운드보다 먼저 친 18홀 라운드와 견준다
  const records = useMemo(() => (round && card?.eligible ? buildRoundRecords(round, allRounds, userName) : []), [round, card, allRounds, userName]);
  const focusMetric = card?.focusCategory ? FOCUS_METRIC[card.focusCategory] : null;
  const goalSuggest = focusMetric && goals.length < MAX_GOALS && !goals.some((g) => g.metric === focusMetric) ? { metric: focusMetric } : null;

  if (!round) return null;

  // 리포트 숫자 — GIR·퍼트·구성은 입력한 홀 기준 (engine/roundSummary.js)
  const stats = summarizeRound(round, activePlayer);
  // 9홀 묶음 — 18홀은 OUT·IN, 9홀은 친 9홀 하나. 수정 모달은 수정 중인 코스 이름으로 이름을 단다
  const nines = ninesOf(round);
  const editNines = editDraft
    ? nines.map(n => ({
        key: n.key,
        label: (n.key === 'out' ? editDraft.outCourseName : editDraft.inCourseName) || (n.key === 'out' ? 'OUT' : 'IN'),
        start: n.holes[0].index,
        end: n.holes[n.holes.length - 1].index + 1,
      }))
    : [];

  // 라운드를 마친 뒤 홀 스코어 고치기 (복기 화면의 '이 홀 스코어 수정').
  // 직접 고친 값이라 strokesManual로 남기고, GIR은 타수·퍼팅 수로 다시 계산한다.
  // 퍼팅 수가 바뀌면 퍼팅별 상세(거리·홀인)가 더는 맞지 않으므로 비운다 — 맞지 않는
  // 상세가 퍼팅 성공률 통계에 섞이는 것보다 낫다.
  const editHoleScore = (holeIdx, { strokes, putts }) => {
    const holes = round.holes.map((h, i) => {
      if (i !== holeIdx) return h;
      const s = h.scores[activePlayer];
      const puttDetails = putts === s.putts ? s.puttDetails : [];
      // 퍼팅 수를 바꾸면 퍼팅별 상세와 함께 그린 밖 칩 기록도 비워진다
      const offGreen = offGreenShots({ putts, puttDetails, offGreen: s.offGreen });
      return {
        ...h,
        scores: {
          ...h.scores,
          [activePlayer]: {
            ...s, strokes, putts,
            puttDetails, offGreen,
            gir: strokes - putts - offGreen.length <= h.par - 2, girAuto: true,
            strokesManual: true, touched: true,
          },
        },
      };
    });
    const updated = { ...round, holes };
    setRound(updated);
    onUpdateRound?.(updated);
  };

  // 요약 카드를 한 장의 이미지로 — 공유 시트가 되는 기기는 공유, 아니면 저장. 그림 코드는 이때 처음 불러온다.
  const handleShareImage = async () => {
    setShareState('working');
    try {
      const { renderReportImage } = await import('../../share/reportImage.js');
      const blob = await renderReportImage(buildReportImageModel(card, { records }));
      const result = await shareOrDownload(blob, reportImageFileName(card), { title: `${card.courseName} 라운드 요약` });
      setShareState(result === 'cancelled' ? null : result);
    } catch (e) {
      console.error('Report image failed', e);
      setShareState('error');
    }
  };

  const openEditModal = () => {
    setEditDraft({
      date: round.date.split('T')[0],
      courseName: round.courseName,
      outCourseName: round.outCourseName || 'OUT',
      inCourseName: round.inCourseName || 'IN',
      players: [...round.players],
      pars: [...round.pars],
      greenSpeed: validSpeed(round.greenSpeed) ? round.greenSpeed : null,
    });
    setEditError(null);
    setShowEditModal(true);
  };

  const updateParDraft = (holeIdx, newPar) => {
    const newPars = [...editDraft.pars];
    newPars[holeIdx] = newPar;
    setEditDraft({ ...editDraft, pars: newPars });
  };

  const saveEdit = () => {
    if (!editDraft.courseName.trim()) {
      setEditError('코스 이름을 입력해 주세요.');
      return;
    }
    // 날짜 입력을 비우거나 잘못된 값이면 저장하지 않고 알린다 (예전에는 예외가 나서 아무 반응이 없었다)
    const newDate = localNoonISO(editDraft.date);
    if (!newDate) {
      setEditError('날짜를 선택해 주세요.');
      return;
    }

    // 스코어는 플레이어 이름으로 묶여 있어서, 두 사람을 같은 이름으로 바꾸면 한쪽
    // 기록이 덮어써져 사라진다. 비운 이름은 원래 이름을 그대로 쓴다.
    const nextNames = editDraft.players.map((p, i) => p.trim() || round.players[i]);
    const norm = (n) => n.trim().toLowerCase();
    if (new Set(nextNames.map(norm)).size !== nextNames.length) {
      setEditError('같은 이름의 플레이어가 있어요. 이름을 다르게 입력해 주세요.');
      return;
    }

    // 파 변경 반영 — hole.par 와 함께 입력하지 않은 홀의 기본 타수·GIR 도 새 파에 맞춘다
    let updatedHoles = applyParEdit(round, editDraft.pars).holes;

    // 플레이어명 변경 시 스코어 키 리매핑
    const hasRenames = round.players.some((p, i) => p !== nextNames[i]);
    if (hasRenames) {
      updatedHoles = updatedHoles.map(h => {
        const newScores = {};
        round.players.forEach((oldName, idx) => {
          newScores[nextNames[idx]] = h.scores[oldName];
        });
        return { ...h, scores: newScores };
      });
    }

    // activePlayer 이름 변경 처리
    const activeIdx = round.players.indexOf(activePlayer);
    const newActivePlayer = activeIdx >= 0 ? nextNames[activeIdx] : activePlayer;

    const updatedRound = {
      ...round,
      date: newDate,   // 로컬 정오 기준 — 타임존 영향 방지
      courseName: editDraft.courseName.trim(),
      outCourseName: editDraft.outCourseName.trim() || 'OUT',
      inCourseName: editDraft.inCourseName.trim() || 'IN',
      players: nextNames,
      pars: editDraft.pars,
      holes: updatedHoles,
      // 그린 스피드는 1인 라운드에서만 다룬다 (퍼팅 분석 대상)
      ...(round.players.length === 1 ? { greenSpeed: editDraft.greenSpeed ?? null } : {}),
    };

    setEditError(null);
    setRound(updatedRound);
    setActivePlayer(newActivePlayer);
    setShowEditModal(false);
    onUpdateRound?.(updatedRound);
  };

  return (
    <div style={styles.container}>
      <header style={styles.pageHeader}>
        <button style={styles.iconBack} onClick={onBack} aria-label="뒤로">
          <ChevronLeft size={22} />
        </button>
        <div style={styles.pageTitle}>라운드 리포트</div>
        <button
          style={{ ...styles.iconBack, color: '#1b64da' }}
          onClick={openEditModal}
          title="라운드 정보 수정" aria-label="라운드 정보 수정"
        >
          <Edit3 size={18} />
        </button>
      </header>

      {/* 라운드 요약 — 결론을 맨 위에 (잘한 점 · 아쉬운 점 · 다음 포커스 · 내 평균과의 비교) */}
      <RoundCard card={card} share={{ state: shareState, onShare: handleShareImage }} records={records}
        goalResults={goalResults} goalSuggest={goalSuggest} onSetGoal={onOpenGoal ? (metric) => onOpenGoal({ metric }) : undefined} />

      <div style={styles.reportHero}>
        <div style={styles.reportDate}>
          {new Date(round.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
          {isNineHoleRound(round) && <span data-role="nine-tag"> · {roundKindLabel(round)}</span>}
        </div>
        <h2 style={styles.reportCourse}>{round.courseName}</h2>

        {round.players.length > 1 && (
          <div style={styles.playerTabs}>
            {round.players.map(p => (
              <button
                key={p}
                style={{
                  ...styles.playerTab,
                  background: activePlayer === p ? '#1b64da' : 'transparent',
                  color: activePlayer === p ? '#ffffff' : '#4e5968',
                  borderColor: activePlayer === p ? '#1b64da' : '#d1d6db'
                }}
                onClick={() => setActivePlayer(p)}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        <div style={styles.bigScoreDisplay}>
          <div style={styles.bigScoreNum}>{stats.total}</div>
          <div style={{ ...styles.bigScoreDiff, color: stats.diff > 0 ? '#c8323a' : stats.diff < 0 ? '#0a7f3f' : '#4e5968' }}>
            ({stats.diff > 0 ? `+${stats.diff}` : stats.diff === 0 ? 'E' : stats.diff})
          </div>
          <div style={styles.bigScoreLabel}>vs par {stats.totalPar}</div>
        </div>

        {/* 18홀만 전반·후반 — 9홀 라운드는 위 큰 숫자가 그 9홀의 합계다 */}
        {!isNineHoleRound(round) && (
          <div style={styles.nineGrid}>
            <div style={styles.nineItem}>
              <div style={styles.nineLabel}>전반 9홀</div>
              <div style={styles.nineValue}>{stats.front9}</div>
            </div>
            <div style={styles.nineDivider} />
            <div style={styles.nineItem}>
              <div style={styles.nineLabel}>후반 9홀</div>
              <div style={styles.nineValue}>{stats.back9}</div>
            </div>
          </div>
        )}
      </div>

      <div style={styles.section}>
        <HoleReviewGrid round={round} player={activePlayer} onSelectHole={setReviewHoleIdx} />
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>핵심 기록</div>
        <div style={styles.keyStatsGrid}>
          <StatTile label="GIR" value={`${stats.girPct}%`} sub={`${stats.girHoles}/${stats.playedCount} holes`} />
          <StatTile label="Fairways" value={stats.fairwayPct != null ? `${stats.fairwayPct}%` : '—'} sub={stats.fairwayTotal > 0 ? `${stats.fairwaysHit}/${stats.fairwayTotal}` : '기록 없음'} />
          <StatTile label="Avg Putts" value={stats.avgPutts} sub={stats.playedCount < round.holes.length ? `${stats.totalPutts} total · 입력한 ${stats.playedCount}홀` : `${stats.totalPutts} total`} />
          <StatTile label="버디 이상" value={stats.birdies + stats.eagles} sub={`이글 ${stats.eagles}`} />
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>스코어 구성</div>
        <div style={styles.breakdownList}>
          <BreakdownBar label="Eagle+" count={stats.eagles} total={Math.max(1, stats.playedCount)} color="#1b64da" />
          <BreakdownBar label="버디" count={stats.birdies} total={Math.max(1, stats.playedCount)} color="#0a7f3f" />
          <BreakdownBar label="Par" count={stats.pars} total={Math.max(1, stats.playedCount)} color="#4e5968" />
          <BreakdownBar label="Bogey" count={stats.bogeys} total={Math.max(1, stats.playedCount)} color="#4e5968" />
          <BreakdownBar label="Double+" count={stats.doubles} total={Math.max(1, stats.playedCount)} color="#c8323a" />
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>홀별 기록</div>
        <ScorecardTable round={round} player={activePlayer} onSelectHole={setReviewHoleIdx} />
      </div>

      {/* 위 요약 카드가 이미 말한 잘한 점·아쉬운 점은 빼고, 홀 단위로 짚어 볼 것만 */}
      <Insights round={round} player={activePlayer} said={card?.eligible ? [...card.strengths, ...card.issues] : []} />

      {(() => {
        const memoedHoles = round.holes.filter(h => h.scores[activePlayer]?.memo);
        if (memoedHoles.length === 0) return null;
        return (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>NOTES · 홀별 메모 ({memoedHoles.length})</div>
            <div style={styles.notesList}>
              {memoedHoles.map(h => {
                const ps = h.scores[activePlayer];
                const diff = ps.strokes - h.par;
                const diffLabel = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`;
                const diffColor = diff <= -1 ? '#0a7f3f' : diff === 0 ? '#4e5968' : diff === 1 ? '#4e5968' : '#c8323a';
                return (
                  <div key={h.holeNumber} style={styles.noteCard}>
                    <div style={styles.noteCardHeader}>
                      <div style={styles.noteCardHole}>
                        HOLE {h.holeNumber}
                        <span style={styles.noteCardPar}>파 {h.par}</span>
                      </div>
                      <div style={{ ...styles.noteCardScore, color: diffColor }}>
                        {ps.strokes}타 ({diffLabel})
                      </div>
                    </div>
                    <div style={styles.noteCardBody}>{ps.memo}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div style={styles.reportActions}>
        <button style={styles.primaryButton} onClick={onNewRound}>
          새 라운드 시작
        </button>
        <div style={styles.reportActionRow}>
          <button style={styles.secondaryButton} onClick={onGoHome}>
            <Home size={16} /> 홈으로
          </button>
          <button style={styles.secondaryButton} onClick={onGoHistory}>
            <BookOpen size={16} /> 히스토리
          </button>
        </div>
      </div>

      {/* 홀별 복기 */}
      {reviewHoleIdx != null && (
        <HoleReview
          round={round}
          player={activePlayer}
          holeIdx={reviewHoleIdx}
          onNav={setReviewHoleIdx}
          onClose={() => setReviewHoleIdx(null)}
          onEditScore={editHoleScore}
        />
      )}

      {/* 라운드 정보 수정 모달 */}
      {showEditModal && editDraft && (
        <div style={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div
            style={{
              ...styles.modalCard,
              maxWidth: '420px',
              width: 'calc(100% - 32px)',
              padding: '20px 16px 24px',
              maxHeight: '92vh',
              overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ fontSize: '17px', fontWeight: '700', color: '#191f28', letterSpacing: '0.04em' }}>
                라운드 정보 수정
              </div>
              <button
                style={{ background: 'none', border: 'none', color: '#4e5968', cursor: 'pointer', padding: '4px' }}
                onClick={() => setShowEditModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* 날짜 */}
            <div style={{ marginBottom: '16px' }}>
              <div style={editSectionLabel}>
                <Calendar size={12} style={{ marginRight: 5 }} />날짜
              </div>
              <input
                type="date"
                value={editDraft.date}
                onChange={e => setEditDraft({ ...editDraft, date: e.target.value })}
                style={editInput}
              />
            </div>

            {/* 코스 정보 */}
            <div style={{ marginBottom: '16px' }}>
              <div style={editSectionLabel}>
                <MapPin size={12} style={{ marginRight: 5 }} />코스 정보
              </div>
              <input
                type="text"
                value={editDraft.courseName}
                onChange={e => setEditDraft({ ...editDraft, courseName: e.target.value })}
                placeholder="코스명"
                maxLength={50}
                style={{ ...editInput, marginBottom: '8px' }}
              />
              {/* 9홀 라운드는 친 9홀의 이름만 */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {nines.some(n => n.key === 'out') && (
                  <input
                    type="text"
                    value={editDraft.outCourseName}
                    onChange={e => setEditDraft({ ...editDraft, outCourseName: e.target.value })}
                    placeholder="전반 코스명 (OUT)"
                    maxLength={20}
                    style={{ ...editInput, flex: 1, minWidth: 0, marginBottom: 0 }}
                  />
                )}
                {nines.some(n => n.key === 'in') && (
                  <input
                    type="text"
                    value={editDraft.inCourseName}
                    onChange={e => setEditDraft({ ...editDraft, inCourseName: e.target.value })}
                    placeholder="후반 코스명 (IN)"
                    maxLength={20}
                    style={{ ...editInput, flex: 1, minWidth: 0, marginBottom: 0 }}
                  />
                )}
              </div>
            </div>

            {/* 플레이어 */}
            <div style={{ marginBottom: '16px' }}>
              <div style={editSectionLabel}>
                <User size={12} style={{ marginRight: 5 }} />플레이어
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {editDraft.players.map((name, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={name}
                    onChange={e => {
                      const newPlayers = [...editDraft.players];
                      newPlayers[idx] = e.target.value;
                      setEditDraft({ ...editDraft, players: newPlayers });
                    }}
                    placeholder={`플레이어 ${idx + 1}`}
                    maxLength={20}
                    style={{ ...editInput, marginBottom: 0 }}
                  />
                ))}
              </div>
            </div>

            {/* 그린 스피드 — 지난 라운드에도 나중에 넣을 수 있다 */}
            {round.players.length === 1 && (
              <div style={{ marginBottom: '16px' }} data-role="edit-green-speed">
                <div style={{ ...editSectionLabel, marginBottom: '8px' }}>그린 스피드</div>
                <GreenSpeedPicker value={editDraft.greenSpeed} onChange={(v) => setEditDraft({ ...editDraft, greenSpeed: v })} />
              </div>
            )}

            {/* 파 설정 */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ ...editSectionLabel, marginBottom: '8px' }}>파 설정</div>

              {/* 파 합계 요약 */}
              <div style={{ ...styles.parSummary, marginBottom: '12px', padding: '14px 16px' }}>
                <div style={styles.parSummaryMain}>
                  <div style={styles.parSummaryLabel}>전체 파</div>
                  <div style={{ ...styles.parSummaryValue, fontSize: '30px' }}>
                    {editDraft.pars.reduce((a, b) => a + b, 0)}
                  </div>
                </div>
                {editNines.length > 1 && (<>
                  <div style={styles.parSummaryDivider} />
                  <div style={styles.parSummaryNines}>
                    {editNines.map(n => (
                      <div key={n.key} style={styles.parSummaryNineRow}>
                        <span style={styles.parSummaryNineLabel}>{n.label}</span>
                        <span style={styles.parSummaryNineValue}>
                          {editDraft.pars.slice(n.start, n.end).reduce((a, b) => a + b, 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>)}
              </div>

              <ParTable pars={editDraft.pars} groups={editNines} holeNo={(i) => holeNoOf(round, i)} onSetPar={updateParDraft} />
            </div>

            {/* 저장이 막힌 이유 — 스크롤 맨 아래 버튼 바로 위에 둬서 놓치지 않게 */}
            {editError && (
              <div role="alert" style={{ fontSize: 14, color: '#c8323a', marginBottom: 12, lineHeight: 1.6 }}>{editError}</div>
            )}

            {/* 버튼 */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                style={{ ...styles.modalBtnCancel, flex: 1 }}
                onClick={() => setShowEditModal(false)}
              >
                취소
              </button>
              <button
                style={{ ...styles.memoSaveBtn, flex: 2 }}
                onClick={saveEdit}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 인라인 스타일 상수
const editSectionLabel = {
  display: 'flex',
  alignItems: 'center',
  fontSize: '12px',
  letterSpacing:'0',
  color: '#4e5968',
  textTransform:'none',
  fontWeight: '700',
  marginBottom: '8px',
};

const editInput = {
  width: '100%',
  padding: '11px 13px',
  background: '#e8ebee',
  border: '1px solid #d1d6db',
  borderRadius: '12px',
  color: '#191f28',
  fontSize: '15px',
  boxSizing: 'border-box',
  outline: 'none',
  fontFamily: "'Noto Sans KR', -apple-system, sans-serif",
};
