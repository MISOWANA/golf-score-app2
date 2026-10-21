// 인사이트 리포트의 장(章) 목록. 리포트는 "공통 단위(타수)로 어디서 잃고 벌었나 → 빅 미스부터 →
// 부문별 진단 → 다음 연습" 순서로 읽힌다. 장마다 탭 하나(= 한 페이지)이고, key 가 탭의 id 다.
export const CHAPTERS = [
  { no: 1, key: 'overview', id: 'ch-overview', short: '종합', title: '종합', question: '이번 라운드를 한 줄로 말하면?' },
  { no: 2, key: 'strokes', id: 'ch-strokes', short: '타수 득실', title: '어디서 잃고 벌었나', question: '모든 샷을 \'타수\'라는 같은 단위로 비교해요' },
  { no: 3, key: 'bigmiss', id: 'ch-bigmiss', short: '빅 미스', title: '큰 숫자부터', question: '나쁜 샷이 잃는 타수는 좋은 샷이 버는 타수보다 커요' },
  { no: 4, key: 'skills', id: 'ch-skills', short: '부문별', title: '부문별 진단', question: '티샷 → 어프로치 → 숏게임 → 퍼팅' },
  { no: 5, key: 'next', id: 'ch-next', short: '다음 연습', title: '다음 라운드', question: '무엇을 연습할까요?' },
  { no: 6, key: 'records', id: 'ch-records', short: '기록', title: '기록으로 보기', question: '숫자와 흐름 — 참고 자료' },
];
