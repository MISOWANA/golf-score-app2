import { useMemo, useState } from 'react';
import InsightCard from './InsightCard.jsx';
import { buildRoundReplay } from '../../engine/insightIndex.js';
import { PUTT_CAUSE_LABEL } from '../../engine/puttAnalysis.js';

const diffColor = (d) => (d <= -2 ? '#f0c93a' : d === -1 ? '#3db87a' : d === 0 ? '#e8edf8' : d === 1 ? '#e57373' : '#ef5350');
const diffBg = (d) => (d <= -2 ? 'rgba(201,162,40,0.18)' : d === -1 ? 'rgba(61,184,122,0.16)' : d === 0 ? '#1a2235' : d === 1 ? 'rgba(229,115,115,0.12)' : 'rgba(239,83,80,0.16)');
const sign = (d) => (d > 0 ? `+${d}` : d === 0 ? 'E' : `${d}`);
const dateLabel = (d) => {
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? String(d).slice(0, 10) : `${t.getMonth() + 1}/${t.getDate()}`;
};

const pill = (active) => ({
  padding: '7px 11px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
  border: `1px solid ${active ? '#c9a228' : '#252f4a'}`,
  background: active ? 'rgba(201,162,40,0.14)' : '#111827',
  color: active ? '#c9a228' : '#8896b0', whiteSpace: 'nowrap',
});

const label = (t) => (
  <div style={{ fontSize: 10, fontWeight: 800, color: '#6e84a8', letterSpacing: '0.18em', margin: '18px 0 8px' }}>{t}</div>
);

// 라운드 복기 — 한 라운드를 홀 순서대로 되짚는다. 어디서 잃었고(분기점), 무엇이 원인이었는지.
export default function RoundReplayPanel({ rounds }) {
  const solo = useMemo(() => rounds.filter(r => r.players.length === 1), [rounds]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [filter, setFilter] = useState('all');       // all | issues | good
  const [open, setOpen] = useState({});              // holeNumber → 펼침
  const round = solo[Math.min(roundIdx, solo.length - 1)];
  const replay = useMemo(() => (round ? buildRoundReplay(round) : null), [round]);

  if (!replay) {
    return <div style={{ textAlign: 'center', color: '#8896b0', fontSize: 13, padding: '28px 12px' }}>복기할 라운드가 없어요.</div>;
  }

  const hasIssue = (h) => h.insights.some(i => i.severity === 'critical' || i.severity === 'warning');
  const hasGood = (h) => h.insights.some(i => i.severity === 'positive');
  const visible = replay.holes.filter(h => {
    if (!h.touched && filter !== 'all') return false;
    if (filter === 'issues') return hasIssue(h);
    if (filter === 'good') return hasGood(h);
    return true;
  });
  const jump = (n) => {
    setFilter('all');
    setOpen(o => ({ ...o, [n]: true }));
    setTimeout(() => document.getElementById(`replay-hole-${n}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'center' }), 50);
  };
  const c = replay.causes;

  return (
    <div data-panel="replay">
      {/* 라운드 선택 */}
      {solo.length > 1 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 6 }}>
          {solo.map((r, i) => {
            const rp = i === roundIdx ? replay : null;
            const sc = rp ? rp.score : r.holes.reduce((a, h) => a + (h.scores[r.players[0]]?.strokes || 0), 0);
            const pr = r.pars.reduce((a, b) => a + b, 0);
            return (
              <button key={r.id} style={pill(i === roundIdx)} onClick={() => { setRoundIdx(i); setOpen({}); }}>
                {dateLabel(r.date)} {r.courseName} · {sc} ({sign(sc - pr)})
              </button>
            );
          })}
        </div>
      )}

      {/* 헤드라인 */}
      <div style={{ background: 'linear-gradient(135deg, #0e1c14 0%, #0f2218 100%)', border: '1px solid #1d3a2a', borderRadius: 8, padding: '16px 16px 14px' }}>
        <div style={{ fontSize: 11, color: '#8ca4bc', letterSpacing: '0.12em', marginBottom: 4 }}>{dateLabel(replay.date)} · {replay.courseName}</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#e8edf8', lineHeight: 1.5, wordBreak: 'keep-all' }} data-role="headline">{replay.headline}</div>
        <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 12, color: '#8896b0', flexWrap: 'wrap' }}>
          <span>전반 <b style={{ color: '#e8edf8' }}>{replay.front}</b> ({sign(replay.front - replay.frontPar)})</span>
          <span>후반 <b style={{ color: '#e8edf8' }}>{replay.back}</b> ({sign(replay.back - replay.backPar)})</span>
          <span>3퍼트 <b style={{ color: '#e8edf8' }}>{replay.threePutts}</b></span>
          <span>페널티 <b style={{ color: '#e8edf8' }}>{replay.penalties}</b></span>
        </div>
      </div>

      {/* 홀 흐름 */}
      {label('FLOW · 홀 흐름')}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 4 }}>
        {replay.holes.map(h => (
          <button key={h.holeNumber} onClick={() => jump(h.holeNumber)} aria-label={`${h.holeNumber}번 홀 ${h.strokes}타`}
            style={{
              padding: '6px 0', borderRadius: 7, cursor: 'pointer',
              border: `1.5px ${h.touched ? 'solid' : 'dashed'} ${h.touched ? diffColor(h.diff) + '66' : '#33415f'}`,
              background: h.touched ? diffBg(h.diff) : '#101a30',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
            }}>
            <span style={{ fontSize: 10, color: '#8ca4bc', fontWeight: 700 }}>{h.holeNumber}</span>
            <span style={{ fontSize: 16, fontWeight: 900, color: h.touched ? diffColor(h.diff) : '#8ca4bc' }}>{h.strokes}</span>
          </button>
        ))}
      </div>
      {replay.defaultHoles > 0 && (
        <div style={{ fontSize: 11, color: '#6e84a8', textAlign: 'right', marginTop: 4 }}>점선 칸 {replay.defaultHoles}개: 입력 없이 파로 저장된 홀 (홀 분석 제외)</div>
      )}

      {/* 분기점 */}
      {(replay.worstHoles.length > 0 || replay.bestHoles.length > 0) && (<>
        {label('TURNING POINTS · 분기점')}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {replay.worstHoles.map(h => (
            <button key={`w${h.holeNumber}`} onClick={() => jump(h.holeNumber)}
              style={{ ...pill(false), border: '1px solid rgba(239,83,80,0.4)', color: '#ef8a87', background: 'rgba(239,83,80,0.08)' }}>
              ▼ {h.holeNumber}번 홀 {sign(h.diff)}
            </button>
          ))}
          {replay.bestHoles.map(h => (
            <button key={`b${h.holeNumber}`} onClick={() => jump(h.holeNumber)}
              style={{ ...pill(false), border: '1px solid rgba(61,184,122,0.4)', color: '#3db87a', background: 'rgba(61,184,122,0.08)' }}>
              ▲ {h.holeNumber}번 홀 {sign(h.diff)}
            </button>
          ))}
        </div>
      </>)}

      {/* 3퍼트 원인 */}
      {replay.threePutts > 0 && (<>
        {label('THREE-PUTT · 3퍼트 원인')}
        <div style={{ background: '#111827', border: '1px solid #1b2238', borderRadius: 8, padding: '12px 14px', fontSize: 12.5, color: '#b4c0d8', lineHeight: 1.7 }} data-role="cause-summary">
          {[
            ['lag', c.counts.lag], ['short', c.counts.short], ['both', c.counts.both],
            ['mid', c.counts.mid], ['close', c.counts.close], ['unknown', c.counts.unknown],
          ].filter(([, n]) => n > 0).map(([k, n]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{PUTT_CAUSE_LABEL[k]}</span><b style={{ color: k === 'unknown' ? '#8896b0' : '#e8edf8' }}>{n}회</b>
            </div>
          ))}
          {c.counts.unknown > 0 && (
            <div style={{ marginTop: 6, fontSize: 11, color: '#6e84a8' }}>판단 보류 = 퍼트 거리가 기록되지 않아 거리감인지 숏퍼트 미스인지 구분할 수 없는 홀입니다.</div>
          )}
        </div>
      </>)}

      {/* 홀별 */}
      {label('HOLE BY HOLE · 홀별 복기')}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {[['all', '전체'], ['issues', '주의·심각'], ['good', '좋은 점']].map(([v, l]) => (
          <button key={v} style={pill(filter === v)} onClick={() => setFilter(v)}>{l}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visible.length === 0 && (
          <div style={{ textAlign: 'center', color: '#8896b0', fontSize: 13, padding: '20px 12px', background: '#111827', border: '1px solid #1b2238', borderRadius: 8 }}>
            해당하는 홀이 없어요.
          </div>
        )}
        {visible.map(h => {
          const isOpen = !!open[h.holeNumber];
          const shown = isOpen ? h.insights : h.insights.slice(0, 2);
          const rest = h.insights.length - shown.length;
          return (
            <div key={h.holeNumber} id={`replay-hole-${h.holeNumber}`} data-hole={h.holeNumber}
              style={{ background: '#0d1424', border: '1px solid #1b2238', borderRadius: 8, padding: '12px 12px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: shown.length || h.memo ? 10 : 0 }}>
                <div style={{
                  minWidth: 44, textAlign: 'center', padding: '6px 0', borderRadius: 8,
                  background: h.touched ? diffBg(h.diff) : '#101a30',
                  border: `1.5px ${h.touched ? 'solid' : 'dashed'} ${h.touched ? diffColor(h.diff) + '66' : '#33415f'}`,
                }}>
                  <div style={{ fontSize: 9, color: '#8ca4bc', fontWeight: 700 }}>HOLE {h.holeNumber}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: h.touched ? diffColor(h.diff) : '#8ca4bc', lineHeight: 1.1 }}>{h.strokes}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#e8edf8' }}>
                    PAR {h.par} · {sign(h.diff)}{h.putts != null ? ` · 퍼트 ${h.putts}` : ''}{h.penalty > 0 ? ` · 페널티 ${h.penalty}` : ''}
                  </div>
                  <div style={{ fontSize: 11.5, color: '#7f8db0', marginTop: 2, lineHeight: 1.5 }}>
                    {!h.touched
                      ? '입력 없이 파(2퍼트)로 저장된 홀'
                      : [
                        h.teeClub ? `티샷 ${h.teeClub.toUpperCase()}` : null,
                        h.fairway === true ? '페어웨이' : h.fairway === false ? '페어웨이 놓침' : null,
                        h.gir === true ? 'GIR' : h.gir === false ? '그린 놓침' : null,
                        h.puttLine ? `퍼트 ${h.puttLine}` : (h.putts >= 1 ? '퍼트 거리 미기록' : null),
                      ].filter(Boolean).join(' · ')}
                  </div>
                </div>
                {h.puttCause && (
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 999, whiteSpace: 'nowrap',
                    color: h.puttCause === 'unknown' ? '#8896b0' : '#c9a228',
                    background: h.puttCause === 'unknown' ? 'rgba(136,150,176,0.12)' : 'rgba(201,162,40,0.12)',
                  }}>{PUTT_CAUSE_LABEL[h.puttCause]}</span>
                )}
              </div>
              {h.memo && (
                <div style={{ fontSize: 12, color: '#a9b8d6', background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '7px 10px', marginBottom: shown.length ? 8 : 0 }}>
                  📝 {h.memo}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {shown.map(ins => <InsightCard key={ins.id} insight={ins} compact={!isOpen} hideHole />)}
              </div>
              {(rest > 0 || (isOpen && h.insights.length > 2)) && (
                <button onClick={() => setOpen(o => ({ ...o, [h.holeNumber]: !isOpen }))}
                  style={{ marginTop: 8, background: 'none', border: 'none', color: '#c9a228', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                  {isOpen ? '접기' : `인사이트 ${rest}개 더 보기`}
                </button>
              )}
              {!isOpen && h.insights.length > 0 && rest === 0 && h.insights.some(i => i.recommendation) && (
                <button onClick={() => setOpen(o => ({ ...o, [h.holeNumber]: true }))}
                  style={{ marginTop: 8, background: 'none', border: 'none', color: '#c9a228', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                  제안 보기
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* 라운드 전체 */}
      {replay.roundInsights.length > 0 && (<>
        {label('ROUND · 라운드 전체 인사이트')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {replay.roundInsights.map(ins => <InsightCard key={ins.id} insight={ins} />)}
        </div>
      </>)}
    </div>
  );
}

