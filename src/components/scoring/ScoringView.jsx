import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Edit3 } from 'lucide-react';
import HoleWizard, { wizardToScoreFields } from './wizard/HoleWizard';
import styles from '../../styles/styles';

const GREEN_MISS_LABELS = { long: 'LONG', short: 'SHORT', left: 'LEFT', right: 'RIGHT' };

const getNavLabelFontSize = (text) => {
  const len = (text || '').length;
  if (len <= 3) return '11px';
  if (len <= 5) return '9px';
  if (len <= 7) return '8px';
  if (len <= 10) return '7px';
  return '6px';
};

export default function ScoringView({ round, onUpdate, onFinish, onExit, onGoToSetup }) {
  const [holeIdx, setHoleIdx] = useState(round.currentHole || 0);
  const [activePlayer, setActivePlayer] = useState(round.players[0]);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [memoDraft, setMemoDraft] = useState('');
  const [showParEditModal, setShowParEditModal] = useState(false);
  const [parDraft, setParDraft] = useState([...round.pars]);
  const [showWizard, setShowWizard] = useState(false);

  const openParEdit = () => {
    setParDraft([...round.pars]);
    setShowParEditModal(true);
  };

  const updateParDraft = (idx, val) => {
    const updated = [...parDraft];
    updated[idx] = val;
    setParDraft(updated);
  };

  const saveParEdit = () => {
    const updated = { ...round };
    updated.pars = [...parDraft];
    updated.holes = round.holes.map((h, i) => {
      const newPar = parDraft[i];
      const newHole = { ...h, par: newPar };
      const updatedScores = {};
      round.players.forEach(p => {
        const ps = h.scores[p];
        if (!ps.touched) {
          const inferred = inferStatsFromStrokes(newPar, newPar);
          updatedScores[p] = {
            ...ps,
            strokes: newPar,
            putts: inferred.putts,
            fairway: newPar > 3 ? true : null,
            gir: inferred.gir,
          };
        } else {
          updatedScores[p] = { ...ps };
        }
      });
      newHole.scores = updatedScores;
      return newHole;
    });
    onUpdate(updated);
    setShowParEditModal(false);
  };

  const hole = round.holes[holeIdx];
  const playerScore = hole.scores[activePlayer];

  const hasProgress = round.holes.some(h =>
    round.players.some(p => h.scores[p]?.touched === true)
  );

  const handleBackClick = () => {
    if (hasProgress) {
      setShowExitConfirm(true);
    } else {
      onGoToSetup();
    }
  };

  const calculateGir = (strokes, putts, par) => {
    if (strokes === null || strokes === undefined) return null;
    if (putts === null || putts === undefined) return null;
    const shotsToGreen = strokes - putts;
    return shotsToGreen <= par - 2;
  };

  const inferStatsFromStrokes = (strokes, par) => {
    const diff = strokes - par;
    let putts, fairway, gir;

    if (strokes === 1) {
      putts = 0;
      fairway = par > 3 ? true : null;
      gir = true;
      return { putts, fairway, gir };
    }

    if (strokes === par - 2) {
      putts = 0;
      fairway = par > 3 ? true : null;
      gir = true;
      return { putts, fairway, gir };
    }

    if (diff <= -2) {
      putts = 1;
      fairway = par > 3 ? true : null;
      gir = true;
    } else if (diff === -1) {
      putts = 1;
      fairway = par > 3 ? true : null;
      gir = true;
    } else if (diff === 0) {
      putts = 2;
      fairway = par > 3 ? true : null;
      gir = true;
    } else if (diff === 1) {
      putts = 2;
      fairway = par > 3 ? true : null;
      gir = false;
    } else if (diff === 2) {
      putts = 2;
      fairway = par > 3 ? false : null;
      gir = false;
    } else {
      putts = 2;
      fairway = par > 3 ? false : null;
      gir = false;
    }

    if (putts >= strokes) {
      putts = Math.max(0, strokes - 1);
    }

    return { putts, fairway, gir };
  };

  const updateScore = (field, value) => {
    const updated = { ...round };
    updated.holes = [...round.holes];
    let newPlayerScore = { ...playerScore, [field]: value, touched: true };

    if (field === 'strokes') {
      const inferred = inferStatsFromStrokes(value, hole.par);
      newPlayerScore.putts = inferred.putts;
      if (hole.par > 3 && !playerScore.touched) newPlayerScore.fairway = inferred.fairway;
      newPlayerScore.gir = inferred.gir;
      newPlayerScore.girAuto = true;
    }

    if (field === 'putts') {
      const autoGir = calculateGir(newPlayerScore.strokes, value, hole.par);
      if (autoGir !== null) {
        newPlayerScore.gir = autoGir;
        newPlayerScore.girAuto = true;
      }
    }

    if (field === 'gir') {
      newPlayerScore.girAuto = false;
    }

    updated.holes[holeIdx] = {
      ...hole,
      scores: {
        ...hole.scores,
        [activePlayer]: newPlayerScore
      }
    };
    onUpdate(updated);
  };

  const updateScoreFields = (fields) => {
    const updated = { ...round };
    updated.holes = [...round.holes];
    let newPlayerScore = { ...playerScore, ...fields, touched: true };

    updated.holes[holeIdx] = {
      ...hole,
      scores: {
        ...hole.scores,
        [activePlayer]: newPlayerScore
      }
    };
    onUpdate(updated);
  };

  const goToHole = (idx) => {
    if (idx >= 0 && idx < 18) {
      const updated = { ...round, currentHole: idx };
      setHoleIdx(idx);
      onUpdate(updated);
    }
  };

  const confirmAndGoToHole = (idx) => {
    const updated = { ...round };
    updated.holes = [...round.holes];
    const currentHoleData = updated.holes[holeIdx];
    const updatedScores = {};
    round.players.forEach(p => {
      updatedScores[p] = { ...currentHoleData.scores[p], touched: true };
    });
    updated.holes[holeIdx] = { ...currentHoleData, scores: updatedScores };
    updated.currentHole = idx;
    setHoleIdx(idx);
    onUpdate(updated);
  };

  const getScoreName = (strokes, par) => {
    if (!strokes) return null;
    if (strokes === 1) return { name: '🏆 HOLE IN ONE', color: '#c9a228', isHoleInOne: true };
    const diff = strokes - par;
    if (diff <= -3) return { name: 'Albatross', color: '#e8c84e' };
    if (diff === -2) return { name: 'Eagle', color: '#c9a228' };
    if (diff === -1) return { name: 'Birdie', color: '#3db87a' };
    if (diff === 0) return { name: 'Par', color: '#8896b0' };
    if (diff === 1) return { name: 'Bogey', color: '#6b7c9a' };
    if (diff === 2) return { name: 'Double', color: '#ef5350' };
    return { name: `+${diff}`, color: '#c62828' };
  };

  const scoreName = getScoreName(playerScore.strokes, hole.par);
  const isLastHole = holeIdx === 17;
  const isPar3AtPar = hole.par === 3 && playerScore.touched && playerScore.strokes === 3;
  const isPar5 = hole.par === 5;

  return (
    <div style={styles.container}>
      <header style={styles.scoringHeader}>
        <button style={styles.iconBack} onClick={handleBackClick}>
          <ChevronLeft size={22} />
        </button>
        <div style={styles.scoringCourse}>{round.courseName}</div>
        <button
          style={{
            width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#8896b0', borderRadius: '8px',
          }}
          onClick={openParEdit}
          aria-label="파 수정"
        >
          <Edit3 size={18} strokeWidth={2} />
        </button>
      </header>

      {/* Progress indicator */}
      {(() => {
        const completedCount = round.holes.filter(h =>
          round.players.every(p => h.scores[p].touched === true)
        ).length;
        return (
          <div style={styles.progressBar}>
            <div style={styles.progressText}>
              <span style={styles.progressNumber}>{completedCount}</span>
              <span style={styles.progressTotal}> / 18 holes</span>
            </div>
            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressFill, width: `${(completedCount / 18) * 100}%` }} />
            </div>
          </div>
        );
      })()}

      {/* Running Score Summary */}
      {(() => {
        const touchedHoles = round.holes.filter(h => h.scores[activePlayer]?.touched === true);
        const playedStrokes = touchedHoles.reduce((s, h) => s + (h.scores[activePlayer]?.strokes || 0), 0);
        const playedPar = touchedHoles.reduce((s, h) => s + h.par, 0);
        const playedPutts = touchedHoles.reduce((s, h) => s + (h.scores[activePlayer]?.putts || 0), 0);
        const playedDiff = playedStrokes - playedPar;
        const diffLabel = playedDiff === 0 ? 'E' : playedDiff > 0 ? `+${playedDiff}` : `${playedDiff}`;
        const diffColor = playedDiff > 0 ? '#ef5350' : playedDiff < 0 ? '#3db87a' : '#8896b0';

        const frontTouched = round.holes.slice(0, 9).filter(h => h.scores[activePlayer]?.touched === true);
        const backTouched = round.holes.slice(9).filter(h => h.scores[activePlayer]?.touched === true);
        const frontStrokes = frontTouched.reduce((s, h) => s + (h.scores[activePlayer]?.strokes || 0), 0);
        const frontPar = frontTouched.reduce((s, h) => s + h.par, 0);
        const backStrokes = backTouched.reduce((s, h) => s + (h.scores[activePlayer]?.strokes || 0), 0);
        const backPar = backTouched.reduce((s, h) => s + h.par, 0);
        const frontDiff = frontStrokes - frontPar;
        const backDiff = backStrokes - backPar;

        const formatDiff = (diff, hasData) => {
          if (!hasData) return '—';
          if (diff === 0) return 'E';
          return diff > 0 ? `+${diff}` : `${diff}`;
        };
        const formatDiffColor = (diff, hasData) => {
          if (!hasData) return '#4d5a78';
          if (diff > 0) return '#ef5350';
          if (diff < 0) return '#3db87a';
          return '#8896b0';
        };

        return (
          <div style={styles.runningScore}>
            <div style={styles.runningScoreMain}>
              <div style={styles.runningScoreLabel}>
                {round.players.length > 1 ? activePlayer : 'SCORE'}
              </div>
              <div style={styles.runningScoreValues}>
                <span style={styles.runningScoreNumber}>{playedStrokes}</span>
                <span style={{ ...styles.runningScoreDiff, color: diffColor }}>
                  {diffLabel}
                </span>
              </div>
            </div>
            <div style={styles.runningScoreDivider} />
            <div style={styles.runningScoreStats}>
              <div style={styles.runningScoreStat}>
                <span style={{
                  ...styles.runningScoreStatLabel,
                  fontSize: (round.outCourseName || 'OUT').length > 5 ? '7px' : '9px',
                  letterSpacing: (round.outCourseName || 'OUT').length > 5 ? '0.05em' : '0.2em',
                }}>
                  {round.outCourseName || 'OUT'}
                </span>
                <span style={{
                  ...styles.runningScoreStatValue,
                  color: formatDiffColor(frontDiff, frontTouched.length > 0),
                }}>
                  {formatDiff(frontDiff, frontTouched.length > 0)}
                </span>
              </div>
              <div style={styles.runningScoreStat}>
                <span style={{
                  ...styles.runningScoreStatLabel,
                  fontSize: (round.inCourseName || 'IN').length > 5 ? '7px' : '9px',
                  letterSpacing: (round.inCourseName || 'IN').length > 5 ? '0.05em' : '0.2em',
                }}>
                  {round.inCourseName || 'IN'}
                </span>
                <span style={{
                  ...styles.runningScoreStatValue,
                  color: formatDiffColor(backDiff, backTouched.length > 0),
                }}>
                  {formatDiff(backDiff, backTouched.length > 0)}
                </span>
              </div>
              <div style={styles.runningScoreStat}>
                <span style={styles.runningScoreStatLabel}>PUTTS</span>
                <span style={styles.runningScoreStatValue}>{playedPutts || '—'}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Hole navigator */}
      <div style={styles.holeNavigator}>
        {[
          { label: round.outCourseName || 'OUT', holes: round.holes.slice(0, 9), offset: 0 },
          { label: round.inCourseName || 'IN', holes: round.holes.slice(9, 18), offset: 9 }
        ].map(({ label, holes, offset }) => (
          <div key={label} style={styles.holeNavTable}>
            <div style={styles.holeNavTableRow}>
              <div style={{
                ...styles.holeNavRowLabel,
                ...styles.holeNavRowLabelHeader,
                fontSize: getNavLabelFontSize(label),
              }}>
                {label}
              </div>
              <div style={styles.holeNavTableCells}>
                {holes.map((h, localIdx) => {
                  const i = offset + localIdx;
                  const isCurrent = i === holeIdx;
                  return (
                    <button
                      key={i}
                      style={{
                        ...styles.holeNavHoleCell,
                        background: isCurrent ? '#c9a228' : 'transparent',
                        color: isCurrent ? '#0b0e18' : '#8896b0',
                      }}
                      onClick={() => goToHole(i)}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={styles.holeNavTableRow}>
              <div style={styles.holeNavRowLabel}>PAR</div>
              <div style={styles.holeNavTableCells}>
                {holes.map((h, localIdx) => {
                  const i = offset + localIdx;
                  const isCurrent = i === holeIdx;
                  const parColor = h.par === 3
                    ? (isCurrent ? '#ff8844' : '#c96820')
                    : h.par === 5
                    ? (isCurrent ? '#5dd49a' : '#2ea868')
                    : (isCurrent ? '#c9a228' : '#8896b0');
                  const parBg = isCurrent
                    ? h.par === 3 ? 'rgba(200,80,20,0.22)'
                      : h.par === 5 ? 'rgba(61,184,122,0.18)'
                      : '#1a2235'
                    : 'transparent';
                  return (
                    <div
                      key={i}
                      style={{
                        ...styles.holeNavParCell,
                        background: parBg,
                        color: parColor,
                        fontWeight: (h.par === 3 || h.par === 5) ? '800' : '700',
                      }}
                    >
                      {h.par}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ ...styles.holeNavTableRow, borderBottom: 'none' }}>
              <div style={styles.holeNavRowLabel}>SCORE</div>
              <div style={styles.holeNavTableCells}>
                {holes.map((h, localIdx) => {
                  const i = offset + localIdx;
                  const done = round.players.every(p => h.scores[p].touched === true);
                  const isCurrent = i === holeIdx;

                  const pScore = h.scores[activePlayer];
                  const strokes = pScore.strokes;
                  const diff = strokes - h.par;

                  const isHoleInOne = done && strokes === 1;
                  let markerStyle = {};
                  if (done) {
                    if (isHoleInOne) {
                      markerStyle = { ...styles.markerHoleInOne };
                    } else if (diff <= -2) {
                      markerStyle = { ...styles.markerEagle };
                    } else if (diff === -1) {
                      markerStyle = { ...styles.markerBirdie };
                    } else if (diff === 0) {
                      markerStyle = { ...styles.markerPar };
                    } else if (diff === 1) {
                      markerStyle = { ...styles.markerBogey };
                    } else {
                      markerStyle = { ...styles.markerDouble };
                    }
                  }

                  return (
                    <button
                      key={i}
                      style={{
                        ...styles.holeNavScoreCell,
                        background: isCurrent ? '#1a2235' : 'transparent',
                      }}
                      onClick={() => goToHole(i)}
                    >
                      <span style={{
                        ...styles.scoreMarker,
                        ...markerStyle,
                        color: isHoleInOne
                          ? '#0b0e18'
                          : done
                          ? (diff <= -1 ? '#3db87a' : diff >= 1 ? '#ef5350' : '#e8edf8')
                          : (isCurrent ? '#c9a228' : '#4d5a78'),
                        fontWeight: done ? '700' : '500',
                      }}>
                        {isHoleInOne && <span style={styles.holeInOneStar}>★</span>}
                        {strokes}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Hole header */}
      <div style={styles.holeHeader}>
        <div>
          <div style={styles.holeLabel}>HOLE {holeIdx + 1}</div>
          <div style={{
            ...styles.holePar,
            color: isPar5 ? '#3db87a' : styles.holePar.color,
          }}>
            PAR {hole.par}
          </div>
          {isPar5 && (
            <div style={{
              display: 'inline-block',
              marginTop: '6px',
              fontSize: '10px',
              fontWeight: '700',
              color: '#3db87a',
              background: 'rgba(61,184,122,0.12)',
              border: '1px solid rgba(61,184,122,0.4)',
              padding: '3px 10px',
              borderRadius: '3px',
              letterSpacing: '0.08em',
            }}>
              찬스홀
            </div>
          )}
        </div>
        {scoreName && (
          <div style={{
            ...styles.scoreName,
            color: isPar3AtPar ? '#fff' : (scoreName.isHoleInOne ? '#fff' : scoreName.color),
            borderColor: isPar3AtPar ? '#c04a10' : scoreName.color,
            background: isPar3AtPar
              ? 'linear-gradient(135deg, #c04a10 0%, #7a2000 100%)'
              : scoreName.isHoleInOne
              ? 'linear-gradient(135deg, #e8c84e 0%, #c9a228 50%, #7a611a 100%)'
              : 'transparent',
            boxShadow: isPar3AtPar
              ? '0 2px 12px rgba(180,60,0,0.45)'
              : scoreName.isHoleInOne
              ? '0 2px 12px rgba(201,162,40,0.5)'
              : 'none',
            fontWeight: (isPar3AtPar || scoreName.isHoleInOne) ? '800' : '600',
            opacity: playerScore.touched ? 1 : 0.35,
            animation: scoreName.isHoleInOne && playerScore.touched ? 'holeInOnePulse 2s ease-in-out infinite' : 'none',
          }}>
            {isPar3AtPar ? 'PAR 3 !' : scoreName.name}
          </div>
        )}
      </div>

      {/* Player tabs */}
      {round.players.length > 1 && (
        <div style={styles.playerTabs}>
          {round.players.map(p => {
            const pScore = hole.scores[p];
            const isTouched = pScore.touched;
            return (
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
                <span style={{
                  ...styles.playerTabScore,
                  background: isTouched ? '#0b0e18' : '#252f4a',
                  opacity: isTouched ? 1 : 0.7
                }}>
                  {pScore.strokes}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Wizard trigger ── */}
      {(() => {
        const touched = playerScore.touched;
        const diff = (playerScore.strokes || hole.par) - hole.par;
        const diffLabel = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`;
        const diffColor = diff < 0 ? '#3db87a' : diff > 0 ? '#ef5350' : '#8896b0';

        if (!touched) {
          return (
            <button style={wBtn} onClick={() => setShowWizard(true)}>
              <span style={{ fontSize: 28 }}>⛳</span>
              <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '0.06em' }}>스코어 입력 시작</span>
              <span style={{ fontSize: 11, color: '#4d5a78' }}>5단계 빠른 입력 (약 5초)</span>
            </button>
          );
        }

        return (
          <div style={wCard}>
            <div style={{
              width: 54, height: 54, borderRadius: '50%', flexShrink: 0,
              background: diff < 0 ? 'rgba(61,184,122,0.15)' : diff > 0 ? 'rgba(239,83,80,0.12)' : 'rgba(136,150,176,0.12)',
              border: `2px solid ${diffColor}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: diffColor, lineHeight: 1 }}>{playerScore.strokes}</span>
              <span style={{ fontSize: 9, color: diffColor, fontWeight: 700 }}>{diffLabel}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 6px', marginBottom: 3 }}>
                {playerScore.teeClub && <span style={wChip}>{({ driver: '드라이버', wood: '우드', hybrid: '하이브리드', iron: '아이언' })[playerScore.teeClub]}</span>}
                {playerScore.remainingDistance && <span style={wChip}>{playerScore.remainingDistance}m</span>}
                {playerScore.lieCondition && <span style={wChip}>{({ flat: 'FLAT', up: 'UP', down: 'DOWN', hook: 'HOOK', slice: 'SLICE' })[playerScore.lieCondition]}</span>}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 6px' }}>
                {playerScore.missDirection && <span style={{ ...wChip, color: '#c9a228' }}>{playerScore.missDirection}시 방향</span>}
                {playerScore.putts != null && <span style={wChip}>{playerScore.putts}퍼트</span>}
                {playerScore.gir && <span style={{ ...wChip, color: '#3db87a' }}>GIR ✓</span>}
              </div>
            </div>
            <button style={wEditBtn} onClick={() => setShowWizard(true)}>수정</button>
          </div>
        );
      })()}

      {/* ── OB / 해저드 / 메모 compact row ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={wPenalty}>
          <span style={wPenaltyLabel}>OB</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button style={wMiniBtn} onClick={() => { const c = playerScore.ob || 0; if (c > 0) updateScore('ob', c - 1); }}>−</button>
            <span style={{ fontSize: 18, fontWeight: 800, color: (playerScore.ob || 0) > 0 ? '#ef5350' : '#e8edf8', minWidth: 20, textAlign: 'center' }}>{playerScore.ob || 0}</span>
            <button style={wMiniBtn} onClick={() => updateScore('ob', Math.min(5, (playerScore.ob || 0) + 1))}>+</button>
          </div>
        </div>
        <div style={wPenalty}>
          <span style={wPenaltyLabel}>해저드</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button style={wMiniBtn} onClick={() => { const c = playerScore.hazard || 0; if (c > 0) updateScore('hazard', c - 1); }}>−</button>
            <span style={{ fontSize: 18, fontWeight: 800, color: (playerScore.hazard || 0) > 0 ? '#c9a228' : '#e8edf8', minWidth: 20, textAlign: 'center' }}>{playerScore.hazard || 0}</span>
            <button style={wMiniBtn} onClick={() => updateScore('hazard', Math.min(5, (playerScore.hazard || 0) + 1))}>+</button>
          </div>
        </div>
        <button
          style={{
            flex: 1, minHeight: 60, borderRadius: 10,
            border: `1px solid ${playerScore.memo ? '#c9a228' : '#252f4a'}`,
            background: playerScore.memo ? 'rgba(201,162,40,0.1)' : '#1a2235',
            color: playerScore.memo ? '#c9a228' : '#8896b0',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
          }}
          onClick={() => { setMemoDraft(playerScore.memo || ''); setShowMemoModal(true); }}
        >
          <Edit3 size={16} strokeWidth={2} />
          <span style={{ letterSpacing: '0.12em' }}>메모</span>
          {playerScore.memo && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#c9a228' }} />}
        </button>
      </div>
      {/* Navigation */}
      <div style={styles.scoringNav}>
        <button
          style={{ ...styles.navBtn, opacity: holeIdx === 0 ? 0.3 : 1 }}
          onClick={() => goToHole(holeIdx - 1)}
          disabled={holeIdx === 0}
        >
          <ChevronLeft size={18} /> 이전
        </button>
        {isLastHole ? (
          <button
            style={styles.finishBtn}
            onClick={() => {
              const updated = { ...round };
              updated.holes = [...round.holes];
              const lastHole = updated.holes[holeIdx];
              const updatedScores = {};
              round.players.forEach(p => {
                updatedScores[p] = { ...lastHole.scores[p], touched: true };
              });
              updated.holes[holeIdx] = { ...lastHole, scores: updatedScores };
              onUpdate(updated);
              setTimeout(() => onFinish(), 50);
            }}
          >
            라운드 종료
          </button>
        ) : (
          <button style={styles.navBtn} onClick={() => confirmAndGoToHole(holeIdx + 1)}>
            다음 <ChevronRight size={18} />
          </button>
        )}
      </div>

      {/* ── Hole Wizard 오버레이 ── */}
      {showWizard && (
        <HoleWizard
          hole={hole}
          par={hole.par}
          holeNumber={holeIdx + 1}
          initialData={playerScore}
          onComplete={(wizardData) => {
            const fields = wizardToScoreFields(wizardData, hole.par, playerScore);
            updateScoreFields(fields);
            setShowWizard(false);
            if (holeIdx < 17) {
              setTimeout(() => confirmAndGoToHole(holeIdx + 1), 350);
            }
          }}
          onClose={() => setShowWizard(false)}
        />
      )}

      {/* Exit 확인 모달 */}
      {showExitConfirm && (
        <div style={styles.modalOverlay} onClick={() => setShowExitConfirm(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalIcon}>⚠️</div>
            <div style={styles.modalTitle}>라운드를 나가시겠어요?</div>
            <div style={styles.modalText}>
              현재까지 입력한 스코어는<br/>저장되지 않습니다
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                style={styles.modalBtnCancel}
                onClick={() => setShowExitConfirm(false)}
              >
                계속 하기
              </button>
              <button
                style={styles.modalBtnPrimary}
                onClick={() => {
                  setShowExitConfirm(false);
                  onGoToSetup();
                }}
              >
                세팅 다시하기
              </button>
              <button
                style={styles.modalBtnConfirm}
                onClick={() => {
                  setShowExitConfirm(false);
                  onExit();
                }}
              >
                홈으로 나가기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 파 수정 모달 */}
      {showParEditModal && (
        <div style={styles.modalOverlay} onClick={() => setShowParEditModal(false)}>
          <div
            style={{
              ...styles.modalCard,
              maxWidth: '400px',
              width: 'calc(100% - 32px)',
              padding: '20px 16px 24px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#e8edf8', letterSpacing: '0.04em' }}>파 수정</div>
              <button
                style={{ background: 'none', border: 'none', color: '#8896b0', cursor: 'pointer', padding: '4px' }}
                onClick={() => setShowParEditModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* 합계 요약 */}
            <div style={{ ...styles.parSummary, marginBottom: '12px' }}>
              <div style={styles.parSummaryMain}>
                <div style={styles.parSummaryLabel}>TOTAL PAR</div>
                <div style={styles.parSummaryValue}>{parDraft.reduce((a, b) => a + b, 0)}</div>
              </div>
              <div style={styles.parSummaryDivider} />
              <div style={styles.parSummaryNines}>
                <div style={styles.parSummaryNineRow}>
                  <span style={styles.parSummaryNineLabel}>{round.outCourseName || 'OUT'}</span>
                  <span style={styles.parSummaryNineValue}>{parDraft.slice(0, 9).reduce((a, b) => a + b, 0)}</span>
                </div>
                <div style={styles.parSummaryNineRow}>
                  <span style={styles.parSummaryNineLabel}>{round.inCourseName || 'IN'}</span>
                  <span style={styles.parSummaryNineValue}>{parDraft.slice(9).reduce((a, b) => a + b, 0)}</span>
                </div>
              </div>
            </div>

            <div style={styles.parTableHint}>← 왼쪽 탭: -1 · 오른쪽 탭: +1 →</div>

            {[
              { label: round.outCourseName || 'OUT', start: 0, end: 9 },
              { label: round.inCourseName || 'IN', start: 9, end: 18 },
            ].map(({ label, start, end }) => (
              <div key={label} style={styles.parTable}>
                <div style={styles.parTableRow}>
                  <div style={{ ...styles.parTableLabel, ...styles.parTableLabelHeader }}>{label}</div>
                  <div style={styles.parTableCells}>
                    {parDraft.slice(start, end).map((_, localIdx) => (
                      <div key={localIdx} style={styles.parTableHoleCell}>{start + localIdx + 1}</div>
                    ))}
                  </div>
                  <div style={{ ...styles.parTableTotal, ...styles.parTableTotalHeader }}>TOT</div>
                </div>
                <div style={{ ...styles.parTableRow, borderBottom: 'none' }}>
                  <div style={styles.parTableLabel}>PAR</div>
                  <div style={styles.parTableCells}>
                    {parDraft.slice(start, end).map((p, localIdx) => {
                      const holeI = start + localIdx;
                      const canDec = p > 3;
                      const canInc = p < 6;
                      const isCurrentHole = holeI === holeIdx;
                      return (
                        <div key={holeI} style={styles.parTableParCell}>
                          <div style={{
                            ...styles.parTableParValue,
                            background: p === 3 ? 'rgba(61,184,122,0.15)' : p === 4 ? '#0e1c14' : p === 5 ? '#c9a228' : '#ef5350',
                            color: p === 3 ? '#3db87a' : p === 4 ? '#e8edf8' : '#0b0e18',
                            outline: isCurrentHole ? '2px solid #c9a228' : 'none',
                            outlineOffset: '1px',
                          }}>
                            {p}
                          </div>
                          <button
                            style={{ ...styles.parTapZone, left: 0, opacity: canDec ? 1 : 0.3, cursor: canDec ? 'pointer' : 'not-allowed' }}
                            onClick={() => canDec && updateParDraft(holeI, p - 1)}
                            disabled={!canDec}
                            aria-label="파 감소"
                          />
                          <button
                            style={{ ...styles.parTapZone, right: 0, opacity: canInc ? 1 : 0.3, cursor: canInc ? 'pointer' : 'not-allowed' }}
                            onClick={() => canInc && updateParDraft(holeI, p + 1)}
                            disabled={!canInc}
                            aria-label="파 증가"
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div style={styles.parTableTotal}>{parDraft.slice(start, end).reduce((a, b) => a + b, 0)}</div>
                </div>
              </div>
            ))}

            <div style={{ fontSize: '11px', color: '#4d5a78', marginTop: '10px', marginBottom: '16px', lineHeight: 1.5 }}>
              * 이미 입력된 홀의 스코어는 유지됩니다.<br/>
              * 미입력 홀은 변경된 파 기준으로 초기화됩니다.
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                style={{ ...styles.modalBtnCancel, flex: 1 }}
                onClick={() => setShowParEditModal(false)}
              >
                취소
              </button>
              <button
                style={{ ...styles.memoSaveBtn, flex: 2 }}
                onClick={saveParEdit}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 메모 작성 모달 */}
      {showMemoModal && (
        <div style={styles.modalOverlay} onClick={() => setShowMemoModal(false)}>
          <div style={styles.memoModalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.memoModalHeader}>
              <div style={styles.memoModalTitle}>
                HOLE {holeIdx + 1} 메모
              </div>
              <div style={styles.memoModalSub}>
                PAR {hole.par} · 이 홀에서 기억하고 싶은 내용을 적어보세요
              </div>
            </div>
            <textarea
              style={styles.memoTextarea}
              value={memoDraft}
              onChange={(e) => setMemoDraft(e.target.value)}
              placeholder="예: 티샷이 좌측 러프로 빠짐. 7번 아이언 어프로치 그린 우측 벙커.&#10;퍼팅 라인 잘 봐서 1퍼팅 성공!"
              maxLength={500}
              autoFocus
              rows={8}
            />
            <div style={styles.memoCharCount}>
              {memoDraft.length} / 500
            </div>
            <div style={styles.modalActions}>
              <button
                style={styles.modalBtnCancel}
                onClick={() => {
                  setShowMemoModal(false);
                  setMemoDraft('');
                }}
              >
                취소
              </button>
              <button
                style={styles.memoSaveBtn}
                onClick={() => {
                  updateScore('memo', memoDraft.trim());
                  setShowMemoModal(false);
                  setMemoDraft('');
                }}
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

// ─── Wizard UI inline style constants ────────────────────────────────────────

const wBtn = {
  width: '100%', minHeight: 88, marginBottom: 16,
  background: 'linear-gradient(135deg, #111827, #1a2235)',
  border: '2px dashed #252f4a', borderRadius: 14, cursor: 'pointer',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  gap: 8, color: '#c9a228',
};

const wCard = {
  display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12,
  background: '#111827', border: '1px solid #1b2238',
  borderRadius: 12, padding: '12px 14px',
};

const wChip = {
  fontSize: 10, color: '#8896b0', background: '#1a2235',
  border: '1px solid #252f4a', borderRadius: 4,
  padding: '2px 7px', fontWeight: 600, letterSpacing: '0.04em',
};

const wEditBtn = {
  padding: '8px 14px', borderRadius: 8,
  border: '1px solid #252f4a', background: '#1a2235',
  color: '#c9a228', fontSize: 12, fontWeight: 700,
  cursor: 'pointer', flexShrink: 0, letterSpacing: '0.04em',
};

const wPenalty = {
  flex: 1, minHeight: 60, background: '#1a2235',
  border: '1px solid #252f4a', borderRadius: 10,
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
};

const wPenaltyLabel = {
  fontSize: 9, color: '#8896b0', fontWeight: 700,
  letterSpacing: '0.18em', textTransform: 'uppercase',
};

const wMiniBtn = {
  width: 28, height: 28, borderRadius: 6,
  border: '1px solid #252f4a', background: '#111827',
  color: '#e8edf8', fontSize: 16, fontWeight: 700,
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
};
