// 핀(깃발) 그림 — 랜딩 휠과 레이더의 가운데에 놓인다. (x, y) 는 컵 위치, k 는 크기 배율.
export default function FlagMark({ x = 170, y = 170, k = 1 }) {
  return (
    <g aria-hidden="true">
      <ellipse cx={x} cy={y + 18 * k} rx={9 * k} ry={2.6 * k} fill="#04100a" />
      <path d={`M${x} ${y + 18 * k}V${y - 16 * k}`} stroke="#c9a228" strokeWidth="2" strokeLinecap="round" />
      <path d={`M${x} ${y - 16 * k}L${x + 15 * k} ${y - 9 * k}L${x} ${y - 2 * k}Z`} fill="#c9a228" />
    </g>
  );
}
