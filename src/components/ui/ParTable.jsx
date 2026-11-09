import { useState } from 'react';
import styles from '../../styles/styles';

// 홀별 파 표 — 라운드 설정 · 라운드 정보 수정 · 입력 중 파 수정이 함께 쓴다.
//
// 예전에는 한 칸(폭 약 33px)을 반으로 나눠 왼쪽 탭 −1 · 오른쪽 탭 +1 이었다: 손가락 닿는 면이 14×36px 라 옆 홀이 바뀌기 쉬웠다.
// 지금은 칸을 누르면 그 홀이 골라지고, 표 아래에 큰 버튼(파 3~7)이 나온다 — 누를 곳은 늘 44px 이상.
//
//   pars       홀별 파 (배열)
//   groups     [{ label, start, end }] 표 한 장(9홀)의 이름과 pars 안의 범위
//   holeNo     (index) → 칸에 적을 홀 번호 (9홀 라운드는 1~9)
//   onSetPar   (index, par) → 파 바꾸기
//   markHole   표에 테두리로 표시할 홀 (입력 중인 홀)
export const PAR_MIN = 3;
export const PAR_MAX = 7; // 정읍 등 실제 코스 DB에 파7 홀이 존재

const PAR_STYLE = {
  3: { background: 'rgba(61,184,122,0.15)', color: '#3db87a' },
  4: { background: '#0e1c14', color: '#e8edf8' },
  5: { background: '#c9a228', color: '#0b0e18' },
  6: { background: '#ef5350', color: '#0b0e18' },
  7: { background: '#ef5350', color: '#0b0e18' },
};
const parLook = (p) => PAR_STYLE[p] ?? PAR_STYLE[6];

export default function ParTable({ pars, groups, holeNo = (i) => i + 1, onSetPar, markHole = null }) {
  const [sel, setSel] = useState(null);
  const picked = sel != null && sel < pars.length ? sel : null;
  const options = Array.from({ length: PAR_MAX - PAR_MIN + 1 }, (_, i) => PAR_MIN + i);

  return (
    <div data-role="par-table">
      <div style={styles.parTableHint}>{picked == null ? '홀을 눌러 파를 바꿔요' : `${holeNo(picked)}번 홀 — 아래에서 파를 골라요`}</div>
      {groups.map(({ label, start, end }) => (
        <div key={label} style={styles.parTable}>
          <div style={styles.parTableRow}>
            <div style={{ ...styles.parTableLabel, ...styles.parTableLabelHeader }}>{label}</div>
            <div style={styles.parTableCells}>
              {pars.slice(start, end).map((_, li) => <div key={li} style={styles.parTableHoleCell}>{holeNo(start + li)}</div>)}
            </div>
            <div style={{ ...styles.parTableTotal, ...styles.parTableTotalHeader }}>TOT</div>
          </div>
          <div style={{ ...styles.parTableRow, borderBottom: 'none' }}>
            <div style={styles.parTableLabel}>PAR</div>
            <div style={styles.parTableCells}>
              {pars.slice(start, end).map((p, li) => {
                const hi = start + li;
                const on = picked === hi;
                return (
                  <button key={hi} type="button" data-role="par-cell" data-hole={hi} aria-pressed={on}
                    aria-label={`${holeNo(hi)}번 홀 파 ${p}`}
                    onClick={() => setSel(on ? null : hi)}
                    style={{ ...styles.parTableParCell, minHeight: 44, padding: '0 1px', background: on ? 'rgba(243,211,107,0.14)' : 'transparent', border: 'none', borderRight: styles.parTableParCell.borderRight, cursor: 'pointer', font: 'inherit', color: 'inherit' }}>
                    <span style={{ ...styles.parTableParValue, ...parLook(p), outline: on ? '2px solid #f3d36b' : markHole === hi ? '2px solid #c9a228' : 'none', outlineOffset: 1 }}>{p}</span>
                  </button>
                );
              })}
            </div>
            <div style={styles.parTableTotal}>{pars.slice(start, end).reduce((a, b) => a + b, 0)}</div>
          </div>
        </div>
      ))}

      {picked != null && (
        <div data-role="par-picker" role="group" aria-label={`${holeNo(picked)}번 홀 파 고르기`}
          style={{ background: '#111a2e', border: '1px solid #3a4a78', borderRadius: 14, padding: '10px 10px 12px', marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#e8edf8', marginBottom: 8, textAlign: 'left' }}>{holeNo(picked)}번 홀 파</div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`, gap: 6 }}>
            {options.map((n) => {
              const cur = pars[picked] === n;
              return (
                <button key={n} type="button" data-role="par-option" data-par={n} aria-pressed={cur} aria-label={`파 ${n}`}
                  onClick={() => onSetPar(picked, n)}
                  style={{ minHeight: 48, borderRadius: 12, cursor: 'pointer', fontSize: 18, fontWeight: 800,
                    border: cur ? '2px solid #f3d36b' : '1px solid #2c3a5c', ...(cur ? parLook(n) : { background: '#0b0e18', color: '#e8edf8' }) }}>
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
