// 지름 340 짜리 원형 SVG 위의 좌표 도우미 (랜딩 휠·랜딩 레이더가 같이 쓴다).
// 각도는 12시 방향이 0°, 시계 방향으로 커진다. 중심은 (170, 170).
export const CENTER = 170;
export const fix = (n) => +n.toFixed(1);
export const hourAngle = (hour) => (hour % 12) * 30;

export const pol = (r, deg) => {
  const a = (deg - 90) * Math.PI / 180;
  return [CENTER + r * Math.cos(a), CENTER + r * Math.sin(a)];
};
export const pt = (p) => `${fix(p[0])} ${fix(p[1])}`;

// 반지름 r 위의 호 (a0 → a1, 시계 방향)
export const arcPath = (r, a0, a1) => `M${pt(pol(r, a0))} A${r} ${r} 0 0 1 ${pt(pol(r, a1))}`;

// 부채꼴(r0=0) 또는 도넛 조각(r0>0)
export function sectorPath(r0, r1, a0, a1) {
  const large = (a1 - a0) > 180 ? 1 : 0;
  if (r0 > 0) {
    return `M${pt(pol(r1, a0))} A${r1} ${r1} 0 ${large} 1 ${pt(pol(r1, a1))} L${pt(pol(r0, a1))} A${r0} ${r0} 0 ${large} 0 ${pt(pol(r0, a0))} Z`;
  }
  return `M${CENTER} ${CENTER} L${pt(pol(r1, a0))} A${r1} ${r1} 0 ${large} 1 ${pt(pol(r1, a1))} Z`;
}

// 점들을 부드러운 닫힌 곡선으로 잇는다 (Catmull-Rom → 3차 베지어)
export function smoothClosed(points) {
  const n = points.length;
  let d = `M${pt(points[0])}`;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n], p1 = points[i], p2 = points[(i + 1) % n], p3 = points[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return `${d}Z`;
}

// 12·3·6·9시는 방향 이름으로 부른다
export const KEY_NAME = { 12: 'LONG', 3: 'RIGHT', 6: 'SHORT', 9: 'LEFT' };
export const QUADRANT_NAME = { long: 'LONG', right: 'RIGHT', short: 'SHORT', left: 'LEFT' };
