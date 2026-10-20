import ConfidenceBadge from './ConfidenceBadge';
import InfoNote from '../ui/InfoNote';
import { tintWash, TINT_SOFT } from '../ui/tint.js';
import { sgTier, SG_LABEL } from '../../engine/strokesGained.js';
import { AWFUL_CONSISTENCY_LIMIT } from '../../engine/bookBenchmarks.js';

// 리포트의 새 패널들 — 어디서 잃었나(구성비) · 큰 실수 · 부문별 SG 머리줄 · 연습 처방.

const SKILL_COLOR = { tee: '#6b8cae', approach: '#8a6fb0', shortGame: '#d98e3e', putting: '#c9a228' };
const card = { background: '#111827', border: '1px solid #1b2238', borderRadius: 16, padding: '12px 14px' };
const dim = { fontSize: 11, color: '#6e84a8', lineHeight: 1.6 };
const signed = (v, d = 2) => (v > 0 ? '+' : '') + Number(v).toFixed(d);

// ── 2장: 투어 대비 잃은 타수의 구성 ──────────────────────────────────────────────
// 롱게임(티샷+어프로치) · 숏게임 · 퍼팅이 잃은 타수를 얼마씩 차지하나.
export function LossShareCard({ shares, coverage }) {
  if (!shares) return null;
  const order = ['tee', 'approach', 'shortGame', 'putting'];
  return (
    <div style={{ ...card, marginBottom: 24 }} data-role="loss-shares">
      <div style={{ fontSize: 11, fontWeight: 800, color: '#8ca4bc', letterSpacing: '0.14em', marginBottom: 10 }}>
        투어 대비 잃은 타수의 구성
        <InfoNote title="잃은 타수의 구성">
          <p>골퍼 사이의 스코어 격차는 약 2/3가 100야드 밖 샷(롱게임)에서, 퍼팅은 약 15%에서 나와요. 투어 상위권의 우위도 드라이빙 28% · 어프로치 40% · 숏게임 17% · 퍼팅 15%로 나뉩니다.</p>
          <p>퍼팅에 연습을 몰아주기 전에 내 구성을 먼저 확인하세요.</p>
        </InfoNote>
      </div>
      <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', background: '#1b2238', marginBottom: 10 }}>
        {order.map((id) => {
          const p = shares.parts.find((x) => x.id === id);
          return p.pct > 0 ? <div key={id} style={{ width: `${p.pct}%`, background: SKILL_COLOR[id] }} /> : null;
        })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginBottom: 10 }}>
        {order.map((id) => {
          const p = shares.parts.find((x) => x.id === id);
          return (
            <div key={id} data-role={`share-${id}`} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: '#b4c0d8' }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: SKILL_COLOR[id] }} />
              {SG_LABEL[id]} <b style={{ color: '#e8edf8' }}>{Math.round(p.pct)}%</b>
            </div>
          );
        })}
      </div>
      <div data-role="share-summary" style={{ fontSize: 13, color: '#e8edf8', lineHeight: 1.6, wordBreak: 'keep-all' }}>
        롱게임(티샷+어프로치) <b>{Math.round(shares.longPct)}%</b> · 숏게임 <b>{Math.round(shares.shortPct)}%</b> · 퍼팅 <b>{Math.round(shares.puttingPct)}%</b>
      </div>
      {coverage != null && coverage < 0.5 && (
        <div data-role="share-coverage" style={{ ...dim, marginTop: 8 }}>
          측정된 샷이 전체의 {Math.round(coverage * 100)}%라 구성비는 참고용이에요.
        </div>
      )}
    </div>
  );
}

// ── 3장: 큰 실수 ────────────────────────────────────────────────────────────────
function Tile({ label, value, sub, warn, role }) {
  return (
    <div style={{ flex: '1 1 45%', background: '#0e1424', border: '1px solid #1b2238', borderRadius: 12, padding: '10px 12px' }}>
      <div style={{ fontSize: 10.5, color: '#8896b0', marginBottom: 4 }}>{label}</div>
      <div data-role={role} style={{ fontSize: 20, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: warn ? '#ef5350' : '#e8edf8' }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: '#6e84a8', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function BigMissesCard({ career, rounds, awful, awfulPoints, awfulOverLimit, teePen, doublePlus, holes, threePutt }) {
  const per = (v) => (career ? `${(v / Math.max(1, rounds)).toFixed(1)}/R` : `${v}`);
  const obWarn = teePen.teeShots >= 10 && teePen.obRate > 0.03;
  return (
    <div style={card} data-role="big-misses">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <Tile label="끔찍한 샷" role="awful-value" warn={awfulOverLimit}
          value={career ? `${awfulPoints.toFixed(1)}점/R` : `${awfulPoints}점`}
          sub={`OB ${awful.ob}회 · 해저드·언플 ${awful.hazard + awful.unplayable}회`} />
        <Tile label="티샷 OB율" role="ob-rate-value" warn={obWarn}
          value={teePen.obRate == null ? '–' : `${(teePen.obRate * 100).toFixed(1)}%`}
          sub={teePen.teeShots > 0 ? `티샷 ${teePen.teeShots}개 중 OB ${teePen.ob}회` : '티샷 벌타 기록 없음'} />
        <Tile label="더블 이상 홀" role="double-value"
          value={career ? `${(doublePlus / Math.max(1, rounds)).toFixed(1)}/R` : `${doublePlus}`}
          sub={holes > 0 ? `전체 홀의 ${((doublePlus / holes) * 100).toFixed(0)}%` : null} />
        <Tile label="3퍼트 이상" role="threeputt-value" value={per(threePutt)} sub={holes > 0 ? `전체 홀의 ${((threePutt / holes) * 100).toFixed(0)}%` : null} />
      </div>
      {awfulOverLimit && (
        <div data-role="awful-warning" style={{ fontSize: 12, color: '#ef8a87', lineHeight: 1.6 }}>
          끔찍한 샷이 90타 전후 기준({AWFUL_CONSISTENCY_LIMIT}점)을 넘었어요 — 연습보다 큰 실수 줄이기가 먼저예요.
        </div>
      )}
    </div>
  );
}

// 큰 실수 카드를 읽는 법 — 카드 제목 옆 (!) 버튼으로 열린다.
export function BigMissesInfo({ career, awful, awfulPoints, teePen }) {
  return (
    <InfoNote title="큰 실수 읽는 법">
      <p>
        <b style={{ color: '#e8edf8' }}>끔찍한 샷</b> — OB는 2점, 해저드·언플레이어블은 1점으로 셉니다.
        {career ? ` (${awful.rounds}라운드 합계, 라운드 평균 ${awfulPoints.toFixed(1)}점)` : ''} 페널티만 센 점수라 뒤땅·토핑 같은 미스샷은 빠져 있어요.
        {' '}90타 전후에서 {AWFUL_CONSISTENCY_LIMIT}점을 넘으면 연습보다 큰 실수 줄이기가 먼저예요.
      </p>
      <p>
        OB는 꼬박 2타를 잃지만 러프에 살짝 들어간 공은 그보다 훨씬 적게 잃어요. 페어웨이 적중률이나 평균 비거리는 이 차이를 가리니, OB율은 따로 봅니다.
        티샷 OB율은 프로 1.5% 이하 · 평균 80타 2% · 100타 3% 이하가 좋은 수준이에요.
        {teePen.skipped > 0 && ` 벌타가 난 샷을 기록하지 않은 ${teePen.skipped}회는 제외했어요.`}
      </p>
    </InfoNote>
  );
}

// ── 4장: 부문별 SG 머리줄 ────────────────────────────────────────────────────────
const SKILL_HINT = {
  tee: '홀 길이를 지도로 찍은(티 지점+핀) par 4·5 홀부터 계산돼요',
  approach: '샷마다 남은 거리와 첫 퍼트 거리를 입력하면 계산돼요',
  shortGame: '그린 밖 100야드 안 샷의 남은 거리를 입력하면 계산돼요',
  putting: '퍼트 거리를 입력하면 계산돼요',
};

export function SkillHeader({ cat, sg, career }) {
  const b = sg?.categories?.[cat];
  const rounds = career ? Math.max(1, sg?.rounds ?? 1) : 1;
  const measured = !!b && b.segments > 0;
  const value = measured ? b.sg / rounds : null;
  return (
    <div data-role={`skill-${cat}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, margin: '0 0 12px', padding: '8px 10px', borderRadius: 8, background: '#0e1424', border: '1px solid #1b2238' }}>
      <div style={{ fontSize: 12, color: '#8ca4bc', fontWeight: 700 }}>{SG_LABEL[cat]} 투어 대비 SG</div>
      {measured ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <b data-role={`skill-sg-${cat}`} style={{ fontSize: 16, fontVariantNumeric: 'tabular-nums', color: value >= 0 ? '#3db87a' : '#ef5350' }}>
            {signed(value)}<span style={{ fontSize: 10.5, fontWeight: 700, color: '#8896b0', marginLeft: 2 }}>{career ? '/R' : '타'}</span>
          </b>
          <ConfidenceBadge tier={sgTier(b.strokes)} n={b.strokes} />
        </div>
      ) : (
        <div data-role={`skill-pending-${cat}`} style={{ fontSize: 11, color: '#6e84a8', textAlign: 'right' }}>
          측정 전
          <InfoNote title={`${SG_LABEL[cat]} 계산 조건`}>{SKILL_HINT[cat]}</InfoNote>
        </div>
      )}
    </div>
  );
}

// ── 5장: 연습 처방 ──────────────────────────────────────────────────────────────
export function PracticeCard({ prescriptions }) {
  if (!prescriptions || prescriptions.cards.length === 0) {
    return (
      <div style={{ ...card, fontSize: 12, color: '#8896b0', lineHeight: 1.6 }} data-role="practice">
        기록이 쌓이면 가장 약한 부문에 맞춘 연습 게임과 목표를 알려 드려요. 샷마다 남은 거리와 퍼트 거리를 입력하면 더 정확해져요.
      </div>
    );
  }
  const { primary, cards } = prescriptions;
  return (
    <div data-role="practice">
      <div style={{ fontSize: 12, color: '#8896b0', marginBottom: 8, lineHeight: 1.5 }}>
        {primary.skill === 'penalty'
          ? '스코어 기준 손실이 가장 큰 곳은 페널티예요.'
          : primary.basis === 'sg'
            ? `투어 대비 SG가 가장 나쁜 부문은 ${SG_LABEL[primary.skill]}예요.`
            : `스코어 기준 손실이 가장 큰 부문은 ${SG_LABEL[primary.skill] ?? primary.skill}예요.`}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {cards.map((c) => (
          <div key={c.id} data-role={`practice-${c.skill}`} style={{ ...card, ...tintWash(SKILL_COLOR[c.skill] ?? '#ef5350', TINT_SOFT) }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#e8edf8', marginBottom: 6 }}>{c.title}</div>
            {c.why && <div style={{ fontSize: 12, color: '#b4c0d8', lineHeight: 1.6, marginBottom: 6, wordBreak: 'keep-all' }}>지금 기록: {c.why}</div>}
            <div style={{ fontSize: 12.5, color: '#e8edf8', lineHeight: 1.6, wordBreak: 'keep-all' }}>{c.drill}</div>
            <div style={{ marginTop: 8, display: 'inline-block', padding: '4px 9px', borderRadius: 8, background: 'rgba(61,184,122,0.1)', border: '1px solid rgba(61,184,122,0.3)', fontSize: 11.5, color: '#7fd4a6', lineHeight: 1.5, wordBreak: 'keep-all' }}>
              목표 · {c.target}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
