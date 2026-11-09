import { fmtPct } from './format.js';

// 페어웨이를 놓친 방향을 말하는 문장 — 스탯 '티샷' 탭과 인사이트 티샷 섹션이 같은 문장을 쓴다
// (같은 라운드면 두 화면이 같은 말을 하도록). tee 는 statsReport.buildTeeStats 의 결과.
export function teeSideText(tee) {
  if (tee.side) {
    return `${tee.side === 'right' ? '오른쪽' : '왼쪽'} 미스가 더 많아요 (오른쪽 ${fmtPct(tee.rightPct)} · 왼쪽 ${fmtPct(tee.leftPct)}).`;
  }
  if (tee.left + tee.right >= 5) {
    return `왼쪽 ${fmtPct(tee.leftPct)} · 오른쪽 ${fmtPct(tee.rightPct)} — 좌우 미스가 고르게 나뉘어요.`;
  }
  return '미스 방향이 더 쌓이면 어느 쪽으로 치우치는지 알려드려요.';
}
