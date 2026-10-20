// 틴트 워시: 카드 모서리에서 번지는 옅은 색과 같은 색 테두리. 막대·장식 없이 색으로 분위기만 낸다.
// 카드의 background · border 만 돌려주므로 카드 스타일 뒤에 펼쳐서 덮어쓴다: style={{ ...styles.card, ...tintWash('#3db87a') }}

const rgbOf = (hex) => {
  const h = String(hex).replace('#', '');
  const full = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)).join(',');
};

export function tintWash(color, { at = '0% 0%', size = '120% 150%', stop = 62, strength = 0.16, border = 0.34, base = '#111827' } = {}) {
  const rgb = rgbOf(color);
  return {
    background: `radial-gradient(${size} at ${at}, rgba(${rgb},${strength}) 0%, rgba(${rgb},0) ${stop}%), ${base}`,
    border: `1px solid rgba(${rgb},${border})`,
  };
}

// 점수가 오른쪽 끝에 있는 한 줄 카드(최근 라운드·히스토리): 색이 점수 쪽에서 번진다.
export const TINT_ROW = { at: '100% 50%', size: '90% 180%', stop: 64, strength: 0.17, border: 0.34 };
// 목록에 여러 장 쌓이는 카드(인사이트·처방): 조금 더 옅게.
export const TINT_SOFT = { strength: 0.11, border: 0.28 };
