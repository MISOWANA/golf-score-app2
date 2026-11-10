// 틴트 워시: 카드 전체에 깔리는 옅은 한 가지 색 (테두리·번짐 없이 납작하게). 막대·장식 없이 색으로 분위기만 낸다.
// 카드의 background · border 만 돌려주므로 카드 스타일 뒤에 펼쳐서 덮어쓴다: style={{ ...styles.card, ...tintWash('#0a7f3f') }}

const rgbOf = (hex) => {
  const h = String(hex).replace('#', '');
  const full = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)).join(',');
};

// at · size · stop · border 는 예전 호출을 그대로 받기 위해 남겨 둔 자리다 (이제 쓰지 않는다)
export function tintWash(color, { strength = 0.16, base = '#f2f4f6' } = {}) {
  const rgb = rgbOf(color);
  const a = +(strength * 0.45).toFixed(3);
  return {
    background: `linear-gradient(rgba(${rgb},${a}), rgba(${rgb},${a})), ${base}`,
    border: "none",
  };
}

// 점수가 오른쪽 끝에 있는 한 줄 카드(최근 라운드·히스토리): 색이 점수 쪽에서 번진다.
export const TINT_ROW = { at: '100% 50%', size: '90% 180%', stop: 64, strength: 0.17, border: 0.34 };
// 목록에 여러 장 쌓이는 카드(인사이트·처방): 조금 더 옅게.
export const TINT_SOFT = { strength: 0.11, border: 0.28 };
