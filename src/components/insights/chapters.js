// 인사이트 리포트의 장(章) 목록. 리포트는 "공통 단위(타수)로 어디서 잃고 벌었나 → 큰 실수부터 →
// 부문별 진단 → 다음 연습" 순서로 읽힌다.
export const CHAPTERS = [
  { no: 1, id: 'ch-overview', short: '한눈에', title: '한눈에 보기', question: '이번 라운드를 한 줄로 말하면?' },
  { no: 2, id: 'ch-strokes', short: '잃고 번 곳', title: '어디서 잃고 벌었나', question: '모든 샷을 \'타수\'라는 같은 단위로 비교해요' },
  { no: 3, id: 'ch-bigmiss', short: '큰 실수', title: '큰 숫자부터', question: '나쁜 샷이 잃는 타수는 좋은 샷이 버는 타수보다 커요' },
  { no: 4, id: 'ch-skills', short: '부문별', title: '부문별 진단', question: '티샷 → 어프로치 → 숏게임 → 퍼팅' },
  { no: 5, id: 'ch-next', short: '다음 연습', title: '다음 라운드', question: '무엇을 연습할까요?' },
  { no: 6, id: 'ch-records', short: '기록', title: '기록으로 보기', question: '숫자와 흐름 — 참고 자료' },
];
