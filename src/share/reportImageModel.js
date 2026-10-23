// 리포트 이미지에 들어가는 내용 — 라운드 요약 카드(engine/roundCard.js)를 이미지용 문구로 바꾼다.
// 그림 그리기(canvas)는 reportImage.js 가 한다. 여기는 순수 계산이라 테스트할 수 있다.

import { recordText } from '../engine/records.js';

const pad = (n) => String(n).padStart(2, '0');

// 비교 칸의 변화량 문구: 스코어는 "▼1.8타", 나머지는 "▲5%" · "▼0.5개". 비슷하면 "비슷"
export function fmtDelta(row) {
  if (row.tone === 'flat') return '비슷';
  const arrow = row.delta > 0 ? '▲' : '▼';
  return `${arrow}${Math.abs(row.delta)}${row.unit}`;
}

export function signedDiff(diff) {
  return diff > 0 ? `+${diff}` : diff === 0 ? 'E' : `${diff}`;
}

export function reportImageFileName(card) {
  const d = new Date(card.date);
  const day = Number.isNaN(d.getTime()) ? 'round' : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const course = String(card.courseName || 'round').replace(/[\\/:*?"<>|\s]+/g, '_');
  return `birdie-buddy-${course}-${day}.png`;
}

// card: buildRoundCard 의 결과(eligible) · records: 이 라운드가 깬 개인 기록들. 반환: 그리기에 필요한 값들
export function buildReportImageModel(card, { records = [] } = {}) {
  const d = new Date(card.date);
  const dateText = Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  return {
    title: card.courseName,
    dateText,
    kind: card.isNine ? '9홀' : '18홀',
    score: card.score,
    par: card.par,
    diff: card.diff,
    diffText: signedDiff(card.diff),
    front: card.front,
    back: card.back,
    headline: card.headline,
    records: records.map(recordText),
    loss: card.loss.map((l) => `${l.label} ${l.strokes}`),
    compareTitle: card.compare ? `내 최근 ${card.compare.basis}라운드 평균 대비` : null,
    compare: (card.compare?.rows ?? []).map((r) => ({ label: r.label, value: `${r.value}${r.unit}`, delta: fmtDelta(r), tone: r.tone })),
    strengths: card.strengths.map((p) => (p.hole != null ? `${p.title} (${p.hole}번 홀)` : p.title)),
    issues: card.issues.map((p) => (p.hole != null ? `${p.title} (${p.hole}번 홀)` : p.title)),
    focus: card.focus,
    empty: card.entered === 0,
  };
}
