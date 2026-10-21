import ConfidenceBadge from './ConfidenceBadge';
import InfoNote from '../ui/InfoNote';
import { speedLabel } from '../../engine/greenSpeed.js';

// 그린 스피드별 퍼팅. 인사이트(PUTTING)와 리포트가 같은 계산(buildGreenSpeedReport)을 받아 같은 숫자를 보여준다.
//   이번 라운드: 오늘 그린의 속도 · 퍼트 · 3퍼트 · 비교 · 요령
//   누적: 느림·보통·빠름·매우 빠름 구간별 평균 (속도를 기록한 라운드만)

const card = { background: '#111827', border: '1px solid #1b2238', borderRadius: 16, padding: '12px 14px' };
const dim = { fontSize: 11, color: '#6e84a8', lineHeight: 1.6 };

// 라운드 수가 쌓인 만큼의 신뢰도 (stats.js 의 low/mid/high 와 같은 이름)
const roundsTier = (n) => (n >= 5 ? 'high' : n >= 3 ? 'mid' : 'low');
const signed = (v, d = 1) => (v > 0 ? '+' : '') + v.toFixed(d);
const sgText = (v) => (v == null ? '–' : (v >= 0 ? '+' : '') + v.toFixed(2));

function Stat({ label, value }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: '#8896b0', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: '#e8edf8', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

export default function GreenSpeedPanel({ report, past = false }) {
  if (!report) return null;

  // ── 누적
  if (report.mode === 'career') {
    return (
      <div style={card} data-role="green-speed-panel">
        {report.speedRounds === 0 ? (
          <div data-role="gs-empty" style={{ fontSize: 12, color: '#8896b0', lineHeight: 1.6 }}>
            그린 스피드를 기록한 라운드가 아직 없어요.
            <InfoNote title="그린 스피드 기록하기">
              라운드를 시작할 때(또는 퍼팅 화면·지난 라운드 수정에서) 그날의 그린 스피드를 정해 두면 빠른 날과 느린 날의 퍼팅을 나눠 비교해 드려요.
            </InfoNote>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', fontSize: 10, color: '#6e84a8', padding: '0 0 6px', borderBottom: '1px solid #1b2238' }}>
              <div style={{ flex: '1 1 78px' }}>
                구간
                <InfoNote title="구간별 평균 보는 법">
                  라운드당 평균이에요. 퍼팅SG는 투어 평균 대비 퍼팅 Strokes Gained(퍼트 거리를 입력한 라운드만)라 그린이 빠르거나 느린 날의 거리 난이도가 반영돼요.
                </InfoNote>
              </div>
              <div style={{ width: 28, textAlign: 'right' }}>R</div>
              <div style={{ width: 42, textAlign: 'right' }}>퍼트</div>
              <div style={{ width: 42, textAlign: 'right' }}>3퍼트</div>
              <div style={{ width: 42, textAlign: 'right' }}>1퍼트</div>
              <div style={{ width: 48, textAlign: 'right' }}>첫퍼트</div>
              <div style={{ width: 48, textAlign: 'right' }}>퍼팅SG</div>
            </div>
            {report.bands.map((b) => (
              <div key={b.id} data-role={`gs-band-${b.id}`} style={{ display: 'flex', alignItems: 'center', fontSize: 12.5, color: '#e8edf8', padding: '8px 0', borderBottom: '1px solid #151c30', fontVariantNumeric: 'tabular-nums' }}>
                <div style={{ flex: '1 1 78px', display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                  <span style={{ fontWeight: 700 }}>{b.label}</span>
                  <ConfidenceBadge tier={roundsTier(b.rounds)} />
                </div>
                <div style={{ width: 28, textAlign: 'right', color: '#8896b0' }}>{b.rounds}</div>
                <div style={{ width: 42, textAlign: 'right' }}>{b.putts.toFixed(1)}</div>
                <div style={{ width: 42, textAlign: 'right' }}>{b.three.toFixed(1)}</div>
                <div style={{ width: 42, textAlign: 'right' }}>{b.one.toFixed(1)}</div>
                <div style={{ width: 48, textAlign: 'right' }}>{b.firstDist != null ? `${b.firstDist.toFixed(1)}m` : '–'}</div>
                <div style={{ width: 48, textAlign: 'right', color: b.sgPutting == null ? '#6e84a8' : b.sgPutting >= 0 ? '#3db87a' : '#ef5350' }}>{sgText(b.sgPutting)}</div>
              </div>
            ))}
            {report.unsetRounds > 0 && (
              <div data-role="gs-unset" style={{ ...dim, marginTop: 8 }}>
                그린 스피드를 정하지 않은 {report.unsetRounds}라운드는 제외했어요.
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ── 이번 라운드
  const r = report.latest;
  return (
    <div style={card} data-role="green-speed-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: '#8896b0' }}>
          {past ? '그날' : '오늘'} 그린
          {r.speed == null && (
            <InfoNote title="그린 스피드 기록하기">
              이 라운드는 그린 스피드를 정하지 않았어요. 라운드 설정·퍼팅 화면·지난 라운드 수정에서 정해 두면 빠른 날과 느린 날의 퍼팅을 나눠 비교해 드려요.
            </InfoNote>
          )}
        </div>
        <div data-role="gs-latest" style={{ fontSize: 13, fontWeight: 800, color: r.speed != null ? '#c9a228' : '#6e84a8' }}>
          {r.speed != null ? speedLabel(r.speed) : '설정 안 함'}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, paddingBottom: 10, borderBottom: '1px solid #1b2238' }}>
        <Stat label="퍼트" value={r.putts} />
        <Stat label="3퍼트+" value={r.three} />
        <Stat label="1퍼트" value={r.one} />
        <Stat label="첫 퍼트 평균" value={r.firstDist != null ? `${r.firstDist.toFixed(1)}m` : '–'} />
      </div>
      {report.compare && (
        <div data-role="gs-compare" style={{ fontSize: 12, color: '#b4c0d8', lineHeight: 1.6, marginTop: 8 }}>
          {report.compare.label} 평균 대비 퍼트 <b style={{ color: report.compare.dPutts > 0 ? '#ef8a87' : report.compare.dPutts < 0 ? '#3db87a' : '#e8edf8' }}>{signed(report.compare.dPutts)}</b>개 ·
          3퍼트 <b style={{ color: report.compare.dThree > 0 ? '#ef8a87' : report.compare.dThree < 0 ? '#3db87a' : '#e8edf8' }}>{signed(report.compare.dThree)}</b>회
        </div>
      )}
      {report.tip && <div data-role="gs-tip" style={{ ...dim, marginTop: 8, color: '#8ca4bc' }}>{report.tip}</div>}
    </div>
  );
}
