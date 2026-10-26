import { Play } from 'lucide-react';

// 기록이 없을 때 빈 화면 대신 보여 주는 안내 — "무엇이 언제부터 보이는지"와 시작 버튼.
// 스탯 · 인사이트 · 홈의 처음 쓰는 사람 카드가 같이 쓴다. 단계는 엔진의 공개 기준과 같다:
//   1R 스코어·복기 · 3R 핸디캡·내 폼(engine/handicap · homeSummary) · 5R 경향 분석(stage 3) · 10R 클럽 거리·확정(stage 4)
const MILESTONES = [
  { n: 1, text: '스코어 추이 · 홀별 복기 · 라운드 요약' },
  { n: 3, text: '핸디캡 · 내 폼 (약점 · 강점)' },
  { n: 5, text: '어프로치 · 숏게임 근접도와 경향 분석' },
  { n: 10, text: '클럽별 거리 · 확정된 분석' },
];

// rounds: 지금까지 쌓인 라운드 수 — 이미 지난 단계는 흐리게(완료), 다음 단계는 금색으로 짚는다
export function MilestoneList({ rounds = 0 }) {
  const next = MILESTONES.find((m) => rounds < m.n);
  return (
    <ol data-role="milestones" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
      {MILESTONES.map((m) => {
        const done = rounds >= m.n;
        const isNext = next?.n === m.n;
        return (
          <li key={m.n} data-role={`milestone-${m.n}`} data-state={done ? 'done' : isNext ? 'next' : 'later'} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ flexShrink: 0, minWidth: 46, textAlign: 'center', padding: '4px 0', borderRadius: 999, fontSize: 13, fontWeight: 800,
              color: done ? '#3db87a' : isNext ? '#0b0e18' : '#a9b8d6', background: done ? 'rgba(61,184,122,0.14)' : isNext ? '#c9a228' : 'rgba(136,150,176,0.14)' }}>
              {done ? '✓' : `${m.n}R`}
            </span>
            <span style={{ fontSize: 14, lineHeight: 1.45, color: done ? '#8896b0' : '#e8edf8', wordBreak: 'keep-all' }}>{m.text}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function StartButton({ onStart, label = '라운드 시작하기' }) {
  if (!onStart) return null;
  return (
    <button type="button" className="bb-press" data-role="empty-start" onClick={onStart}
      style={{ width: '100%', minHeight: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, border: 'none',
        background: 'linear-gradient(180deg, #e8c84e 0%, #c9a228 100%)', color: '#0b0e18', fontSize: 16, fontWeight: 900, cursor: 'pointer' }}>
      <Play size={17} fill="#0b0e18" />{label}
    </button>
  );
}

export default function EmptyGuide({ icon, title, lead, rounds = 0, onStart, startLabel, role = 'empty-guide' }) {
  return (
    <div data-role={role} style={{ margin: '8px 0 0', padding: '26px 18px 20px', borderRadius: 20, background: '#111827', border: '1px solid #1b2238', textAlign: 'center' }}>
      <div aria-hidden="true" style={{ fontSize: 40, lineHeight: 1, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 19, fontWeight: 800, color: '#e8edf8', marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 15, lineHeight: 1.65, color: '#a9b8d6', marginBottom: 20, wordBreak: 'keep-all' }}>{lead}</div>
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.14em', color: '#8aa0c4', textAlign: 'left', marginBottom: 10 }}>기록이 쌓이면</div>
      <MilestoneList rounds={rounds} />
      {onStart && <div style={{ marginTop: 20 }}><StartButton onStart={onStart} label={startLabel} /></div>}
    </div>
  );
}
