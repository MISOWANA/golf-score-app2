import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, Target, Flag, Circle, X, Check, Edit3, AlertTriangle } from 'lucide-react';
import styles from '../../styles/styles';
import ShotShapeIcon from './ShotShapeIcon';
import GreenMissSelector from './GreenMissSelector';

const GREEN_MISS_LABELS = { long: 'LONG', short: 'SHORT', left: 'LEFT', right: 'RIGHT' };

export default function ScoringView({ round, onUpdate, onFinish, onExit, onGoToSetup }) {
  const [holeIdx, setHoleIdx] = useState(round.currentHole || 0);
  const [activePlayer, setActivePlayer] = useState(round.players[0]);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [memoDraft, setMemoDraft] = useState('');

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
    }
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

  return (
    <div style={styles.container}>
      <header style={styles.scoringHeader}>
        <button style={styles.iconBack} onClick={handleBackClick}>
          <ChevronLeft size={22} />
        </button>
        <div style={styles.scoringCourse}>{round.courseName}</div>
        <div style={{ width: 40 }} />
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
                <span style={styles.runningScoreStatLabel}>OUT</span>
                <span style={{
                  ...styles.runningScoreStatValue,
                  color: formatDiffColor(frontDiff, frontTouched.length > 0),
                }}>
                  {formatDiff(frontDiff, frontTouched.length > 0)}
                </span>
              </div>
              <div style={styles.runningScoreStat}>
                <span style={styles.runningScoreStatLabel}>IN</span>
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
          { label: 'OUT', holes: round.holes.slice(0, 9), offset: 0 },
          { label: 'IN', holes: round.holes.slice(9, 18), offset: 9 }
        ].map(({ label, holes, offset }) => (
          <div key={label} style={styles.holeNavTable}>
            <div style={styles.holeNavTableRow}>
              <div style={{ ...styles.holeNavRowLabel, ...styles.holeNavRowLabelHeader }}>
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
                  return (
                    <div
                      key={i}
                      style={{
                        ...styles.holeNavParCell,
                        background: isCurrent ? '#1a2235' : 'transparent',
                        color: isCurrent ? '#c9a228' : '#8896b0',
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
          <div style={styles.holePar}>PAR {hole.par}</div>
        </div>
        {scoreName && (
          <div style={{
            ...styles.scoreName,
            color: scoreName.isHoleInOne ? '#fff' : scoreName.color,
            borderColor: scoreName.color,
            background: scoreName.isHoleInOne ? 'linear-gradient(135deg, #e8c84e 0%, #c9a228 50%, #7a611a 100%)' : 'transparent',
            boxShadow: scoreName.isHoleInOne ? '0 2px 12px rgba(201,162,40,0.5)' : 'none',
            fontWeight: scoreName.isHoleInOne ? '800' : '600',
            opacity: playerScore.touched ? 1 : 0.35,
            animation: scoreName.isHoleInOne && playerScore.touched ? 'holeInOnePulse 2s ease-in-out infinite' : 'none',
          }}>
            {scoreName.name}
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

      {/* Score input */}
      <div style={styles.scoringSection}>
        <div style={styles.fieldLabel}>스코어 (타수)</div>
        <div style={styles.bigScoreContainer}>
          <div style={styles.bigScoreHalves}>
            <div style={styles.bigScoreLeftHalf} />
            <div style={styles.bigScoreRightHalf} />
          </div>
          <div style={{ ...styles.bigScoreSideAbs, left: '14px' }}>
            <ChevronLeft size={28} strokeWidth={2.5} />
            <span style={styles.bigScoreSideLabel}>−1</span>
          </div>
          <div style={styles.bigScoreCenter}>
            <div style={styles.bigScoreValue}>
              {playerScore.strokes || hole.par}
            </div>
            <div style={styles.bigScoreHint}>
              {playerScore.strokes === hole.par && !playerScore.touched
                ? 'PAR · 좌우 탭으로 조정'
                : `vs Par ${hole.par}`}
            </div>
          </div>
          <div style={{ ...styles.bigScoreSideAbs, right: '14px' }}>
            <span style={styles.bigScoreSideLabel}>+1</span>
            <ChevronRight size={28} strokeWidth={2.5} />
          </div>
          <button
            style={{ ...styles.bigScoreTapZone, left: 0 }}
            onClick={() => updateScore('strokes', Math.max(1, (playerScore.strokes || hole.par) - 1))}
            aria-label="스코어 감소"
          />
          <button
            style={{ ...styles.bigScoreTapZone, right: 0 }}
            onClick={() => updateScore('strokes', (playerScore.strokes || hole.par) + 1)}
            aria-label="스코어 증가"
          />
        </div>
      </div>

      {/* Detailed stats */}
      <div style={styles.statsSection}>
        {/* 티샷 구질 */}
        {hole.par > 3 && (
          <div style={styles.statRow}>
            <div style={styles.statRowLabel}>
              <TrendingUp size={13} strokeWidth={2} />
              <span>티샷 구질</span>
            </div>
            <div style={styles.shotShapeRow}>
              {[
                { id: 'hook', label: '훅', desc: '강한 좌' },
                { id: 'fade', label: '페이드', desc: '약한 우' },
                { id: 'straight', label: '스트레이트', desc: '직진' },
                { id: 'draw', label: '드로우', desc: '약한 좌' },
                { id: 'slice', label: '슬라이스', desc: '강한 우' },
              ].map(s => {
                const active = playerScore.shotShape === s.id;
                let color;
                if (s.id === 'straight') color = '#e8edf8';
                else if (s.id === 'hook') color = '#ef5350';
                else if (s.id === 'draw') color = '#3db87a';
                else if (s.id === 'fade') color = '#c9a228';
                else color = '#c62828';

                return (
                  <button
                    key={s.id}
                    style={{
                      ...styles.shotShapeBtn,
                      background: active ? color : 'transparent',
                      color: active ? '#fff' : color,
                      borderColor: active ? color : '#252f4a',
                      fontWeight: active ? '800' : '700',
                    }}
                    onClick={() => updateScore('shotShape', active ? null : s.id)}
                    title={s.desc}
                  >
                    <span style={styles.shotShapeLabel}>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* FAIRWAY HIT */}
        {hole.par > 3 && (
          <div style={styles.statRow}>
            <div style={{...styles.statRowLabel, whiteSpace: 'normal', minWidth: 'auto'}}>
              <Target size={13} strokeWidth={2} />
              <span style={{display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2}}>FAIRWAY <br />HIT</span>
            </div>
            <div style={styles.fairwayHitRow}>
              <button
                style={{
                  ...styles.fairwayHitBtn,
                  background: playerScore.fairway === true ? '#3db87a' : 'transparent',
                  color: playerScore.fairway === true ? '#0b0e18' : '#3db87a',
                  borderColor: playerScore.fairway === true ? '#3db87a' : '#252f4a',
                }}
                onClick={() => {
                  const isToggleOff = playerScore.fairway === true;
                  updateScoreFields({
                    fairway: isToggleOff ? null : true,
                    fairwayHit: isToggleOff ? null : 'C',
                  });
                }}
              >
                O
              </button>
              <button
                style={{
                  ...styles.fairwayHitBtn,
                  background: playerScore.fairway === false ? '#ef5350' : 'transparent',
                  color: playerScore.fairway === false ? '#0b0e18' : '#ef5350',
                  borderColor: playerScore.fairway === false ? '#ef5350' : '#252f4a',
                }}
                onClick={() => {
                  const isToggleOff = playerScore.fairway === false;
                  updateScoreFields({
                    fairway: isToggleOff ? null : false,
                    fairwayHit: isToggleOff ? null : (playerScore.fairwayHit === 'C' ? null : playerScore.fairwayHit),
                  });
                }}
              >
                X
              </button>
            </div>
          </div>
        )}

        {/* LANDING POINT */}
        {hole.par > 3 && (
          <div style={styles.statRow}>
            <div style={{...styles.statRowLabel, whiteSpace: 'normal', minWidth: 'auto'}}>
              <Flag size={13} strokeWidth={2} />
              <span style={{display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2}}>LANDING <br />POINT</span>
            </div>
            <div style={styles.fairwayHitRow}>
              {['L', 'C', 'R'].map(point => (
                <button
                  key={point}
                  style={{
                    ...styles.fairwayHitBtn,
                    background: playerScore.fairwayHit === point ? (point === 'C' ? '#3db87a' : '#c9a228') : 'transparent',
                    color: playerScore.fairwayHit === point ? '#0b0e18' : (point === 'C' ? '#3db87a' : '#c9a228'),
                    borderColor: playerScore.fairwayHit === point ? (point === 'C' ? '#3db87a' : '#c9a228') : '#252f4a',
                  }}
                  onClick={() => {
                    const isToggleOff = playerScore.fairwayHit === point;
                    updateScoreFields({ fairwayHit: isToggleOff ? null : point });
                  }}
                >
                  {point}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* GIR */}
        <div style={styles.statRow}>
          <div style={styles.statRowLabel}>
            <Flag size={13} strokeWidth={2} />
            <span>GIR</span>
            {playerScore.girAuto && playerScore.gir !== null && (
              <span style={styles.autoBadge}>AUTO</span>
            )}
          </div>
          <div style={styles.toggleRow}>
            <button
              style={{ ...styles.toggleBtn, background: playerScore.gir === true ? '#3db87a' : 'transparent', color: playerScore.gir === true ? '#0b0e18' : '#e8edf8' }}
              onClick={() => updateScore('gir', true)}
            >
              <Check size={14} /> 온
            </button>
            <button
              style={{ ...styles.toggleBtn, background: playerScore.gir === false ? '#ef5350' : 'transparent', color: playerScore.gir === false ? '#0b0e18' : '#e8edf8' }}
              onClick={() => updateScore('gir', false)}
            >
              <X size={14} /> 오프
            </button>
          </div>
        </div>

        {/* 그린 방향 */}
        <div style={{ ...styles.statRow, flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
          <div style={{ ...styles.statRowLabel, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Target size={13} strokeWidth={2} />
              <span>그린 방향</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {playerScore.greenMiss && (
                <span style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  background: 'rgba(61,184,122,0.15)',
                  color: '#3db87a',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  letterSpacing: '0.04em',
                }}>
                  {GREEN_MISS_LABELS[playerScore.greenMiss]}
                </span>
              )}
              {playerScore.greenMiss && (
                <button
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#4d5a78',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  onClick={() => updateScore('greenMiss', null)}
                  aria-label="그린 방향 초기화"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
          <GreenMissSelector
            value={playerScore.greenMiss}
            onChange={(v) => updateScore('greenMiss', v)}
          />
        </div>

        {/* 페널티 */}
        <div style={styles.statRow}>
          <div style={styles.statRowLabel}>
            <AlertTriangle size={13} strokeWidth={2} />
            <span>페널티</span>
          </div>
          <div style={styles.penaltyGroup}>
            {/* OB 카운터 */}
            <div style={styles.penaltyItem}>
              <div style={styles.penaltyLabel}>OB</div>
              <div style={{ ...styles.splitStepper, width: '100%' }}>
                <div style={styles.splitStepperHalves}>
                  <div style={styles.splitStepperLeftHalf} />
                  <div style={styles.splitStepperRightHalf} />
                </div>
                <div style={styles.splitStepperContent}>
                  <span style={{
                    ...styles.splitStepperValue,
                    color: (playerScore.ob || 0) > 0 ? '#ef5350' : '#e8edf8',
                  }}>
                    {playerScore.ob || 0}
                  </span>
                </div>
                <button
                  style={{
                    ...styles.splitStepperTapZone,
                    left: 0,
                    opacity: (playerScore.ob || 0) > 0 ? 1 : 0.4,
                    cursor: (playerScore.ob || 0) > 0 ? 'pointer' : 'not-allowed',
                  }}
                  onClick={() => {
                    const curr = playerScore.ob || 0;
                    if (curr > 0) updateScore('ob', curr - 1);
                  }}
                  disabled={(playerScore.ob || 0) <= 0}
                  aria-label="OB 감소"
                />
                <button
                  style={{
                    ...styles.splitStepperTapZone,
                    right: 0,
                    opacity: (playerScore.ob || 0) < 5 ? 1 : 0.4,
                    cursor: (playerScore.ob || 0) < 5 ? 'pointer' : 'not-allowed',
                  }}
                  onClick={() => {
                    const curr = playerScore.ob || 0;
                    if (curr < 5) updateScore('ob', curr + 1);
                  }}
                  disabled={(playerScore.ob || 0) >= 5}
                  aria-label="OB 증가"
                />
              </div>
            </div>

            {(playerScore.ob > 0 || playerScore.hazard > 0) && (
              <div style={styles.penaltyTotalBadge}>
                +{(playerScore.ob || 0) + (playerScore.hazard || 0)}
              </div>
            )}

            {/* 해저드 카운터 */}
            <div style={styles.penaltyItem}>
              <div style={styles.penaltyLabel}>해저드</div>
              <div style={{ ...styles.splitStepper, width: '100%' }}>
                <div style={styles.splitStepperHalves}>
                  <div style={styles.splitStepperLeftHalf} />
                  <div style={styles.splitStepperRightHalf} />
                </div>
                <div style={styles.splitStepperContent}>
                  <span style={{
                    ...styles.splitStepperValue,
                    color: (playerScore.hazard || 0) > 0 ? '#c9a228' : '#e8edf8',
                  }}>
                    {playerScore.hazard || 0}
                  </span>
                </div>
                <button
                  style={{
                    ...styles.splitStepperTapZone,
                    left: 0,
                    opacity: (playerScore.hazard || 0) > 0 ? 1 : 0.4,
                    cursor: (playerScore.hazard || 0) > 0 ? 'pointer' : 'not-allowed',
                  }}
                  onClick={() => {
                    const curr = playerScore.hazard || 0;
                    if (curr > 0) updateScore('hazard', curr - 1);
                  }}
                  disabled={(playerScore.hazard || 0) <= 0}
                  aria-label="해저드 감소"
                />
                <button
                  style={{
                    ...styles.splitStepperTapZone,
                    right: 0,
                    opacity: (playerScore.hazard || 0) < 5 ? 1 : 0.4,
                    cursor: (playerScore.hazard || 0) < 5 ? 'pointer' : 'not-allowed',
                  }}
                  onClick={() => {
                    const curr = playerScore.hazard || 0;
                    if (curr < 5) updateScore('hazard', curr + 1);
                  }}
                  disabled={(playerScore.hazard || 0) >= 5}
                  aria-label="해저드 증가"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 퍼팅 + 메모 */}
        <div style={styles.statRow}>
          <div style={styles.statRowLabel}>
            <Circle size={13} strokeWidth={2} />
            <span>퍼팅</span>
          </div>
          <div style={styles.puttMemoRow}>
            {(() => {
              const strokes = playerScore.strokes || hole.par;
              const maxPutts = strokes === 1 ? 0 : Math.max(0, strokes - 1);
              const currPutts = playerScore.putts ?? 2;
              const canDec = currPutts > 0;
              const canInc = currPutts < maxPutts;
              return (
                <div style={{ ...styles.splitStepper, flex: 3 }}>
                  <div style={styles.splitStepperHalves}>
                    <div style={styles.splitStepperLeftHalf} />
                    <div style={styles.splitStepperRightHalf} />
                  </div>
                  <div style={styles.splitStepperContent}>
                    <span style={styles.splitStepperValue}>{currPutts}</span>
                  </div>
                  <button
                    style={{
                      ...styles.splitStepperTapZone,
                      left: 0,
                      opacity: canDec ? 1 : 0.4,
                      cursor: canDec ? 'pointer' : 'not-allowed',
                    }}
                    onClick={() => { if (canDec) updateScore('putts', currPutts - 1); }}
                    disabled={!canDec}
                    aria-label="퍼팅 감소"
                  />
                  <button
                    style={{
                      ...styles.splitStepperTapZone,
                      right: 0,
                      opacity: canInc ? 1 : 0.4,
                      cursor: canInc ? 'pointer' : 'not-allowed',
                    }}
                    onClick={() => { if (canInc) updateScore('putts', currPutts + 1); }}
                    disabled={!canInc}
                    aria-label="퍼팅 증가"
                  />
                </div>
              );
            })()}

            <button
              style={{
                ...styles.memoButton,
                ...(playerScore.memo ? styles.memoButtonFilled : {}),
              }}
              onClick={() => {
                setMemoDraft(playerScore.memo || '');
                setShowMemoModal(true);
              }}
            >
              <Edit3 size={13} strokeWidth={2.2} />
              <span>메모</span>
              {playerScore.memo && <span style={styles.memoDot} />}
            </button>
          </div>
        </div>
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
          <button style={styles.navBtn} onClick={() => goToHole(holeIdx + 1)}>
            다음 <ChevronRight size={18} />
          </button>
        )}
      </div>

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
