// 새 라운드 객체를 만든다 (GolfScoringApp.startNewRound 가 부른다).
//
// nine: null = 18홀 · 'out' = 9홀(OUT 코스의 파) · 'in' = 9홀(IN 코스의 파). 9홀이면 처음부터 9개 홀만 만들고 홀 번호는 1~9 다.
// pars 는 18홀 전체 파 배열이고, 9홀이면 그중 해당 9개를 쓴다.
import { holePlan } from './nines.js';
import { validSpeed } from './greenSpeed.js';

// 입력하지 않은 홀의 기본값 — 파 · 2퍼트 · GIR 성공. touched 가 false 인 동안은 통계에서 세지 않는다.
export const defaultHoleScore = (par) => ({
  strokes: par,
  putts: 2,
  fairway: null,
  fairwayHit: null,
  shotShape: null,
  ob: 0,
  hazard: 0,
  unplayable: 0,
  gir: true,
  girAuto: true,
  greenMiss: null,
  memo: '',
  touched: false,
});

export function createRound({
  id, players, courseName, pars, outCourseName, inCourseName, teeBox, date, clubRecommend, greenSpeed, nine = null,
}) {
  const plan = holePlan(pars, nine);
  return {
    id,
    date: date || new Date().toISOString(),
    courseName,
    outCourseName: outCourseName || 'OUT',
    inCourseName: inCourseName || 'IN',
    teeBox: teeBox || null,
    players,
    pars: plan.map((h) => h.par),
    ...(nine ? { nine } : {}),
    holes: plan.map(({ holeNumber, par }) => ({
      holeNumber,
      par,
      scores: Object.fromEntries(players.map((p) => [p, defaultHoleScore(par)])),
    })),
    currentHole: 0,
    completed: false,
    // 진행률·누적 스코어를 '확정한 홀'(confirmed) 기준으로 센다. 이 표시가 없는 예전 진행 중 라운드는
    // 입력한 홀(touched) 기준 그대로 둔다.
    trackConfirm: true,
    // 거리별 클럽 추천을 받을지 — 라운드 시작 전에 정한다. 이 값이 없는 예전 라운드는 켜짐으로 본다.
    clubRecommend: clubRecommend !== false,
    // 그날의 그린 스피드(스팀프 피트). 설정하지 않았으면 null — 퍼팅 분석에서 속도별 비교에 쓴다.
    greenSpeed: validSpeed(greenSpeed) ? greenSpeed : null,
  };
}
