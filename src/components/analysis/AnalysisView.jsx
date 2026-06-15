import React, { useState } from 'react';
import { ChevronLeft, Home, BookOpen, Edit3, X, Calendar, MapPin, User } from 'lucide-react';
import styles from '../../styles/styles';
import StatTile from './StatTile';
import BreakdownBar from './BreakdownBar';
import ScorecardTable from './ScorecardTable';
import Insights from './Insights';

export default function AnalysisView({ round: initialRound, onBack, onGoHome, onGoHistory, onNewRound, onUpdateRound }) {
  const [round, setRound] = useState(initialRound);
  const [activePlayer, setActivePlayer] = useState(initialRound?.players[0]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDraft, setEditDraft] = useState(null);

  if (!round) return null;

  const calculateStats = (player) => {
    const holes = round.holes;
    const total = holes.reduce((s, h) => s + (h.scores[player]?.strokes || 0), 0);
    const totalPar = round.pars.reduce((a, b) => a + b, 0);
    const totalPutts = holes.reduce((s, h) => s + (h.scores[player]?.putts || 0), 0);
    const girHoles = holes.filter(h => h.scores[player]?.gir === true).length;
    const par4or5 = holes.filter(h => h.par > 3);
    const fairwaysHit = par4or5.filter(h => h.scores[player]?.fairway === true).length;
    const fairwayTotal = par4or5.length;

    const birdies = holes.filter(h => h.scores[player]?.strokes && h.scores[player].strokes - h.par === -1).length;
    const eagles = holes.filter(h => h.scores[player]?.strokes && h.scores[player].strokes - h.par <= -2).length;
    const pars = holes.filter(h => h.scores[player]?.strokes === h.par).length;
    const bogeys = holes.filter(h => h.scores[player]?.strokes && h.scores[player].strokes - h.par === 1).length;
    const doubles = holes.filter(h => h.scores[player]?.strokes && h.scores[player].strokes - h.par >= 2).length;

    const front9 = holes.slice(0, 9).reduce((s, h) => s + (h.scores[player]?.strokes || 0), 0);
    const back9 = holes.slice(9).reduce((s, h) => s + (h.scores[player]?.strokes || 0), 0);

    return {
      total, totalPar, diff: total - totalPar, totalPutts,
      girHoles, girPct: ((girHoles / 18) * 100).toFixed(0),
      fairwaysHit, fairwayTotal, fairwayPct: fairwayTotal > 0 ? ((fairwaysHit / fairwayTotal) * 100).toFixed(0) : 0,
      birdies, eagles, pars, bogeys, doubles,
      avgPutts: (totalPutts / 18).toFixed(1),
      front9, back9
    };
  };

  const stats = calculateStats(activePlayer);

  const openEditModal = () => {
    setEditDraft({
      date: round.date.split('T')[0],
      courseName: round.courseName,
      outCourseName: round.outCourseName || 'OUT',
      inCourseName: round.inCourseName || 'IN',
      players: [...round.players],
      pars: [...round.pars],
    });
    setShowEditModal(true);
  };

  const updateParDraft = (holeIdx, newPar) => {
    const newPars = [...editDraft.pars];
    newPars[holeIdx] = newPar;
    setEditDraft({ ...editDraft, pars: newPars });
  };

  const saveEdit = () => {
    if (!editDraft.courseName.trim()) return;

    // 파 변경 반영 — hole.par 업데이트
    let updatedHoles = round.holes.map((h, i) => ({
      ...h,
      par: editDraft.pars[i],
    }));

    // 플레이어명 변경 시 스코어 키 리매핑
    const hasRenames = round.players.some((p, i) => p !== editDraft.players[i]);
    if (hasRenames) {
      updatedHoles = updatedHoles.map(h => {
        const newScores = {};
        round.players.forEach((oldName, idx) => {
          const newName = (editDraft.players[idx] || '').trim() || oldName;
          newScores[newName] = h.scores[oldName];
        });
        return { ...h, scores: newScores };
      });
    }

    // activePlayer 이름 변경 처리
    const activeIdx = round.players.indexOf(activePlayer);
    const newActivePlayer = activeIdx >= 0
      ? ((editDraft.players[activeIdx] || '').trim() || activePlayer)
      : activePlayer;

    // 날짜: 로컬 정오 기준으로 저장해 타임존 영향 방지
    const [y, m, d] = editDraft.date.split('-').map(Number);
    const newDateObj = new Date(y, m - 1, d, 12, 0, 0);

    const updatedRound = {
      ...round,
      date: newDateObj.toISOString(),
      courseName: editDraft.courseName.trim(),
      outCourseName: editDraft.outCourseName.trim() || 'OUT',
      inCourseName: editDraft.inCourseName.trim() || 'IN',
      players: editDraft.players.map(p => p.trim()).filter(p => p),
      pars: editDraft.pars,
      holes: updatedHoles,
    };

    setRound(updatedRound);
    setActivePlayer(newActivePlayer);
    setShowEditModal(false);
    onUpdateRound?.(updatedRound);
  };

  return (
    <div style={styles.container}>
      <header style={styles.pageHeader}>
        <button style={styles.iconBack} onClick={onBack}>
          <ChevronLeft size={22} />
        </button>
        <div style={styles.pageTitle}>Round Report</div>
        <button
          style={{ ...styles.iconBack, color: '#c9a228' }}
          onClick={openEditModal}
          title="라운드 정보 수정"
        >
          <Edit3 size={18} />
        </button>
      </header>

      <div style={styles.reportHero}>
        <div style={styles.reportDate}>
          {new Date(round.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        <h2 style={styles.reportCourse}>{round.courseName}</h2>

        {round.players.length > 1 && (
          <div style={styles.playerTabs}>
            {round.players.map(p => (
              <button
                key={p}
                style={{
                  ...styles.playerTab,
                  background: activePlayer === p ? '#c9a228' : 'transparent',
                  color: activePlayer === p ? '#0b0e18' : '#8896b0',
                  borderColor: activePlayer === p ? '#c9a228' : '#252f4a'
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
          <div style={{ ...styles.bigScoreDiff, color: stats.diff > 0 ? '#ef5350' : stats.diff < 0 ? '#3db87a' : '#8896b0' }}>
            {stats.diff > 0 ? `+${stats.diff}` : stats.diff === 0 ? 'Even' : stats.diff}
          </div>
          <div style={styles.bigScoreLabel}>vs par {stats.totalPar}</div>
        </div>

        <div style={styles.nineGrid}>
          <div style={styles.nineItem}>
            <div style={styles.nineLabel}>FRONT 9</div>
            <div style={styles.nineValue}>{stats.front9}</div>
          </div>
          <div style={styles.nineDivider} />
          <div style={styles.nineItem}>
            <div style={styles.nineLabel}>BACK 9</div>
            <div style={styles.nineValue}>{stats.back9}</div>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>KEY STATS</div>
        <div style={styles.keyStatsGrid}>
          <StatTile label="GIR" value={`${stats.girPct}%`} sub={`${stats.girHoles}/18 holes`} />
          <StatTile label="Fairways" value={`${stats.fairwayPct}%`} sub={`${stats.fairwaysHit}/${stats.fairwayTotal}`} />
          <StatTile label="Avg Putts" value={stats.avgPutts} sub={`${stats.totalPutts} total`} />
          <StatTile label="Birdies+" value={stats.birdies + stats.eagles} sub={`${stats.eagles} eagle`} />
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>SCORE BREAKDOWN</div>
        <div style={styles.breakdownList}>
          <BreakdownBar label="Eagle+" count={stats.eagles} total={18} color="#c9a228" />
          <BreakdownBar label="Birdie" count={stats.birdies} total={18} color="#3db87a" />
          <BreakdownBar label="Par" count={stats.pars} total={18} color="#8896b0" />
          <BreakdownBar label="Bogey" count={stats.bogeys} total={18} color="#6b7c9a" />
          <BreakdownBar label="Double+" count={stats.doubles} total={18} color="#ef5350" />
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>HOLE BY HOLE</div>
        <ScorecardTable round={round} player={activePlayer} />
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>INSIGHTS</div>
        <Insights round={round} player={activePlayer} />
      </div>

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
                const diffColor = diff <= -1 ? '#3db87a' : diff === 0 ? '#8896b0' : diff === 1 ? '#6b7c9a' : '#ef5350';
                return (
                  <div key={h.holeNumber} style={styles.noteCard}>
                    <div style={styles.noteCardHeader}>
                      <div style={styles.noteCardHole}>
                        HOLE {h.holeNumber}
                        <span style={styles.noteCardPar}>PAR {h.par}</span>
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
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#e8edf8', letterSpacing: '0.04em' }}>
                라운드 정보 수정
              </div>
              <button
                style={{ background: 'none', border: 'none', color: '#8896b0', cursor: 'pointer', padding: '4px' }}
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
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={editDraft.outCourseName}
                  onChange={e => setEditDraft({ ...editDraft, outCourseName: e.target.value })}
                  placeholder="전반 코스명 (OUT)"
                  maxLength={20}
                  style={{ ...editInput, flex: 1, marginBottom: 0 }}
                />
                <input
                  type="text"
                  value={editDraft.inCourseName}
                  onChange={e => setEditDraft({ ...editDraft, inCourseName: e.target.value })}
                  placeholder="후반 코스명 (IN)"
                  maxLength={20}
                  style={{ ...editInput, flex: 1, marginBottom: 0 }}
                />
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

            {/* 파 설정 */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ ...editSectionLabel, marginBottom: '8px' }}>파 설정</div>

              {/* 파 합계 요약 */}
              <div style={{ ...styles.parSummary, marginBottom: '12px', padding: '14px 16px' }}>
                <div style={styles.parSummaryMain}>
                  <div style={styles.parSummaryLabel}>TOTAL PAR</div>
                  <div style={{ ...styles.parSummaryValue, fontSize: '30px' }}>
                    {editDraft.pars.reduce((a, b) => a + b, 0)}
                  </div>
                </div>
                <div style={styles.parSummaryDivider} />
                <div style={styles.parSummaryNines}>
                  <div style={styles.parSummaryNineRow}>
                    <span style={styles.parSummaryNineLabel}>{editDraft.outCourseName || 'OUT'}</span>
                    <span style={styles.parSummaryNineValue}>
                      {editDraft.pars.slice(0, 9).reduce((a, b) => a + b, 0)}
                    </span>
                  </div>
                  <div style={styles.parSummaryNineRow}>
                    <span style={styles.parSummaryNineLabel}>{editDraft.inCourseName || 'IN'}</span>
                    <span style={styles.parSummaryNineValue}>
                      {editDraft.pars.slice(9).reduce((a, b) => a + b, 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '11px', color: '#4d5a78', marginBottom: '8px', fontStyle: 'italic' }}>
                ← 왼쪽 탭: -1 · 오른쪽 탭: +1 →
              </div>

              {[
                { label: editDraft.outCourseName || 'OUT', start: 0, end: 9 },
                { label: editDraft.inCourseName || 'IN', start: 9, end: 18 },
              ].map(({ label, start, end }) => (
                <div key={label} style={{ ...styles.parTable, marginBottom: '8px' }}>
                  <div style={styles.parTableRow}>
                    <div style={{ ...styles.parTableLabel, ...styles.parTableLabelHeader }}>{label}</div>
                    <div style={styles.parTableCells}>
                      {editDraft.pars.slice(start, end).map((_, localIdx) => (
                        <div key={localIdx} style={styles.parTableHoleCell}>{start + localIdx + 1}</div>
                      ))}
                    </div>
                    <div style={{ ...styles.parTableTotal, ...styles.parTableTotalHeader }}>TOT</div>
                  </div>
                  <div style={{ ...styles.parTableRow, borderBottom: 'none' }}>
                    <div style={styles.parTableLabel}>PAR</div>
                    <div style={styles.parTableCells}>
                      {editDraft.pars.slice(start, end).map((p, localIdx) => {
                        const holeI = start + localIdx;
                        const canDec = p > 3;
                        const canInc = p < 6;
                        return (
                          <div key={holeI} style={styles.parTableParCell}>
                            <div style={{
                              ...styles.parTableParValue,
                              background: p === 3 ? 'rgba(61,184,122,0.15)' : p === 4 ? '#0e1c14' : p === 5 ? '#c9a228' : '#ef5350',
                              color: p === 3 ? '#3db87a' : p === 4 ? '#e8edf8' : '#0b0e18',
                            }}>
                              {p}
                            </div>
                            <button
                              style={{ ...styles.parTapZone, left: 0, opacity: canDec ? 1 : 0.3, cursor: canDec ? 'pointer' : 'not-allowed' }}
                              onClick={() => canDec && updateParDraft(holeI, p - 1)}
                              disabled={!canDec}
                            />
                            <button
                              style={{ ...styles.parTapZone, right: 0, opacity: canInc ? 1 : 0.3, cursor: canInc ? 'pointer' : 'not-allowed' }}
                              onClick={() => canInc && updateParDraft(holeI, p + 1)}
                              disabled={!canInc}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div style={styles.parTableTotal}>
                      {editDraft.pars.slice(start, end).reduce((a, b) => a + b, 0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

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
  fontSize: '10px',
  letterSpacing: '0.2em',
  color: '#8896b0',
  textTransform: 'uppercase',
  fontWeight: '700',
  marginBottom: '8px',
};

const editInput = {
  width: '100%',
  padding: '11px 13px',
  background: '#1a2235',
  border: '1px solid #252f4a',
  borderRadius: '6px',
  color: '#e8edf8',
  fontSize: '14px',
  boxSizing: 'border-box',
  outline: 'none',
  fontFamily: "'Noto Sans KR', -apple-system, sans-serif",
};
