import { Share2, Trophy } from 'lucide-react';
import KoEnTitle from '../ui/KoEnTitle';
import { fmtDelta } from '../../share/reportImageModel.js';
import { goalText, metricOf } from '../../engine/goals.js';
import { recordText } from '../../engine/records.js';

// 라운드 요약 카드 — 라운드 직후 Round Report 맨 위. 한 줄 총평 · 잃은 타수 · 내 평균과의 비교 · 잘한 점 · 아쉬운 점 · 다음 포커스.
// 숫자와 문장은 engine/roundCard.js 가 만든다 (인사이트 탭과 같은 계산).
//   share  { state: null | 'working' | 'shared' | 'downloaded' | 'error', onShare }
//   goalResults  [{ goal, ev: { value, met } | null, progress }] — 정해 둔 목표를 이 라운드로 판정한 결과
//   records  이 라운드가 깬 개인 기록들 (engine/records.js) — 있으면 금색 배지로 맨 위에 보여 준다
//   goalSuggest  { metric } — 포커스를 목표로 정하는 버튼에 쓸 지표 (이미 정했거나 꽉 찼으면 null) · onSetGoal(metric)
const TONE = { good: '#3db87a', bad: '#ef5350', flat: '#8896b0' };

const box = {
  background: 'radial-gradient(120% 140% at 0% 0%, rgba(201,162,40,0.10) 0%, rgba(201,162,40,0) 55%), #111827',
  border: '1px solid rgba(201,162,40,0.28)', borderRadius: 18, padding: '14px 14px 14px', marginBottom: 12, textAlign: 'left',
};

const SHARE_NOTE = { working: '이미지를 만드는 중…', shared: '공유했어요', downloaded: '이미지를 저장했어요', error: '이미지를 만들지 못했어요' };

function PointList({ title, color, items, role }) {
  if (!items.length) return null;
  return (
    <div data-role={role} style={{ marginTop: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color, marginBottom: 4 }}>{title}</div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
        {items.map((p) => (
          <li key={`${p.id}-${p.hole ?? ''}`} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 8 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#e8edf8', lineHeight: 1.4, wordBreak: 'keep-all' }}>
                {p.title}
                {p.hole != null && <span style={{ fontSize: 12, fontWeight: 700, color: '#c9a228', marginLeft: 6, whiteSpace: 'nowrap' }}>{p.hole}번 홀</span>}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function RoundCard({ card, share, records = [], goalResults = [], goalSuggest = null, onSetGoal }) {
  if (!card?.eligible) return null;
  const noEntry = card.entered === 0;
  const compare = card.compare;
  return (
    <section data-role="round-card" style={box}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <div style={{ color: '#b4c0d8' }}><KoEnTitle ko="라운드 요약" en="ROUND SUMMARY" /></div>
        {share && (
          <button type="button" data-role="share-image" disabled={share.state === 'working'} onClick={share.onShare}
            aria-label="리포트 이미지 저장·공유"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 11px', borderRadius: 999, border: '1px solid #2c3a5c', background: 'rgba(255,255,255,0.04)', color: '#e8edf8', fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
            <Share2 size={15} />이미지
          </button>
        )}
      </div>

      {records.length > 0 && (
        <div data-role="card-records" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {records.map((r) => (
            <span key={r.id} data-role="card-record" data-record={r.id}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 14, fontWeight: 800, color: '#f3d36b', background: 'rgba(201,162,40,0.16)', border: '1px solid rgba(201,162,40,0.55)', borderRadius: 999, padding: '4px 11px' }}>
              <Trophy size={14} />{recordText(r)}
            </span>
          ))}
        </div>
      )}

      <div data-role="card-headline" style={{ fontSize: 16, fontWeight: 800, color: '#e8edf8', lineHeight: 1.55, wordBreak: 'keep-all' }}>{card.headline}</div>
      {share?.state && <div role="status" data-role="share-note" style={{ fontSize: 13, color: share.state === 'error' ? '#ef5350' : '#3db87a', marginTop: 4 }}>{SHARE_NOTE[share.state]}</div>}

      {goalResults.length > 0 && (
        <div data-role="card-goals" style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {goalResults.map(({ goal, ev, progress }) => ev && (
            <div key={goal.id} data-role="card-goal" data-met={ev.met ? '1' : '0'}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10,
                background: ev.met ? 'rgba(61,184,122,0.1)' : 'rgba(239,83,80,0.08)', border: `1px solid ${ev.met ? 'rgba(61,184,122,0.4)' : 'rgba(239,83,80,0.35)'}` }}>
              <span aria-hidden="true" style={{ fontSize: 18, fontWeight: 900, color: ev.met ? '#3db87a' : '#ef5350', width: 20, textAlign: 'center' }}>{ev.met ? '✓' : '✗'}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#e8edf8', lineHeight: 1.4, wordBreak: 'keep-all' }}>
                  목표 {goalText(goal)} <span style={{ color: ev.met ? '#3db87a' : '#ef5350' }}>→ {ev.value}{metricOf(goal.metric).unit} {ev.met ? '달성' : '미달'}</span>
                </div>
                {progress.total > 1 && <div style={{ fontSize: 12, color: '#8896b0' }}>최근 {progress.total}라운드 중 {progress.met}번 달성</div>}
              </div>
            </div>
          ))}
          {goalResults.every((r) => !r.ev) && (
            <div data-role="card-goals-note" style={{ fontSize: 13, color: '#6e84a8', lineHeight: 1.5 }}>
              {card.isNine ? '9홀 라운드는 목표를 판정하지 않아요.' : '목표는 정한 날부터 판정해요.'}
            </div>
          )}
        </div>
      )}

      {noEntry ? (
        <div data-role="card-empty" style={{ fontSize: 14, color: '#8896b0', lineHeight: 1.6, marginTop: 10 }}>입력한 홀이 없어 분석할 내용이 적어요. 홀별 복기에서 기록을 채우면 요약이 풍부해져요.</div>
      ) : (
        <>
          {card.loss.length > 0 && (
            <div data-role="card-loss" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 10 }}>
              <span style={{ fontSize: 13, color: '#8896b0', fontWeight: 700 }}>잃은 타수</span>
              {card.loss.map((l) => (
                <span key={l.label} style={{ fontSize: 14, fontWeight: 800, color: '#ef5350', background: 'rgba(239,83,80,0.1)', border: '1px solid rgba(239,83,80,0.3)', borderRadius: 999, padding: '2px 10px', whiteSpace: 'nowrap' }}>{l.label} {l.strokes}</span>
              ))}
            </div>
          )}

          <div data-role="card-compare" style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #1b2238' }}>
            {compare ? (
              <>
                <div style={{ fontSize: 13, color: '#8896b0', fontWeight: 700, marginBottom: 6 }}>내 최근 {compare.basis}라운드 평균 대비</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))', gap: 6 }}>
                  {compare.rows.map((r) => (
                    <div key={r.id} data-role={`compare-${r.id}`} data-tone={r.tone} style={{ textAlign: 'center', padding: '6px 2px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: '#8896b0', fontWeight: 700, whiteSpace: 'nowrap' }}>{r.label}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#e8edf8', fontVariantNumeric: 'tabular-nums' }}>{r.value}<span style={{ fontSize: 11, color: '#8896b0' }}>{r.unit}</span></div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: TONE[r.tone], whiteSpace: 'nowrap' }}>{fmtDelta(r)}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: '#6e84a8', lineHeight: 1.55 }}>
                {card.isNine ? '9홀 라운드는 평균 비교에서 빠져요.' : '내 평균과의 비교는 이전 18홀 라운드가 3개 쌓이면 보여 드려요.'}
              </div>
            )}
          </div>

          <PointList title="잘한 점" color="#3db87a" items={card.strengths} role="card-strengths" />
          <PointList title="아쉬운 점" color="#ef5350" items={card.issues} role="card-issues" />

          {card.focus && (
            <div data-role="card-focus" style={{ marginTop: 12, padding: '9px 11px', borderRadius: 10, background: 'rgba(201,162,40,0.1)', border: '1px solid rgba(201,162,40,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#c9a228' }}>다음 포커스</div>
                {goalSuggest && onSetGoal && (
                  <button type="button" data-role="focus-set-goal" onClick={() => onSetGoal(goalSuggest.metric)}
                    style={{ padding: '4px 10px', borderRadius: 999, border: '1px solid rgba(201,162,40,0.6)', background: 'rgba(201,162,40,0.14)', color: '#f3d36b', fontSize: 13, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>이걸 목표로</button>
                )}
              </div>
              <div style={{ fontSize: 14, color: '#e8edf8', lineHeight: 1.6, wordBreak: 'keep-all' }}>{card.focus}</div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
