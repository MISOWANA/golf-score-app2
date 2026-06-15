// 국내 골프장 데이터베이스
// courses: 9홀 단위로 저장. 2개=단일 18홀 자동 적용, 3개 이상=조합 선택 UI

// 표준 9홀 파 패턴 (합계 36)
const PA = [4,4,3,5,4,4,3,4,5];
const PB = [4,3,4,5,4,4,3,5,4];
const PC = [4,4,3,4,5,4,3,5,4];
const PD = [4,3,5,4,4,3,4,5,4];
const PE = [4,4,3,5,4,3,4,5,4];
const PF = [5,4,3,4,4,3,5,4,4];
const PG = [4,4,4,3,5,4,3,4,5];
const PH = [3,4,5,4,4,3,5,4,4];

export const COURSES = [

  // ── 서울 ─────────────────────────────────────────────────
  {
    name: '서울 컨트리클럽', location: '서울',
    courses: [
      { name: '이스트', pars: [4,4,3,4,5,4,3,5,4] },
      { name: '웨스트', pars: [4,3,4,5,4,4,3,5,4] },
    ],
  },
  {
    name: '태릉 컨트리클럽', location: '서울',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '뚝섬 골프 퍼블릭', location: '서울',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },

  // ── 경기 북부 ────────────────────────────────────────────
  {
    name: '한양 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: [4,3,5,4,4,3,4,5,4] },
      { name: '인',   pars: [4,3,4,5,4,4,3,5,4] },
    ],
  },
  {
    name: '뉴서울 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: [4,5,3,4,4,3,5,4,4] },
      { name: '인',   pars: [4,5,3,4,4,3,4,5,4] },
    ],
  },
  {
    name: '베어크리크 골프클럽', location: '경기',
    courses: [
      { name: '아웃', pars: [4,4,3,5,4,3,4,5,4] },
      { name: '인',   pars: [4,4,3,5,4,4,3,4,5] },
    ],
  },
  {
    name: '태광 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '포천 힐스 컨트리클럽', location: '경기',
    courses: [
      { name: '레이크',   pars: PD },
      { name: '포레스트', pars: PB },
    ],
  },
  {
    name: '아시아나 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PF },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '포천 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '가평 베네스트 골프클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '설악파인힐스 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '도전힐스 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PE },
    ],
  },
  {
    name: '연천 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '동두천 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PF },
    ],
  },
  {
    name: '파주 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '고양 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '일산 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PF },
      { name: '인',   pars: PE },
    ],
  },
  {
    name: '가평 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '의정부 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PG },
    ],
  },
  {
    name: '남양주 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '퀸즈파크 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '구리 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '하남 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PF },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '춘천 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PD },
    ],
  },

  // ── 경기 서부·남부 ────────────────────────────────────────
  {
    name: '안양 컨트리클럽', location: '경기',
    courses: [
      { name: 'A코스', pars: [4,4,3,5,4,4,3,4,5] },
      { name: 'B코스', pars: [4,4,3,4,5,4,3,4,5] },
    ],
  },
  {
    name: '남촌 컨트리클럽', location: '경기',
    courses: [
      { name: '레이크',   pars: [4,4,3,4,5,4,3,4,5] },
      { name: '포레스트', pars: [4,4,3,5,4,3,4,5,4] },
    ],
  },
  {
    name: '레이크사이드 컨트리클럽', location: '경기',
    courses: [
      { name: '파인',  pars: [4,4,3,5,4,4,3,4,5] },
      { name: '레이크', pars: [4,3,5,4,4,3,4,5,4] },
    ],
  },
  {
    name: '블루원 컨트리클럽', location: '경기',
    courses: [
      { name: '파인',  pars: PA },
      { name: '레이크', pars: PD },
    ],
  },
  {
    name: '프리스틴 밸리 골프클럽', location: '경기',
    courses: [
      { name: '레이크',   pars: [4,3,5,4,4,3,4,5,4] },
      { name: '포레스트', pars: [4,3,4,5,4,4,3,5,4] },
      { name: '마운틴',  pars: [4,4,3,5,4,3,4,5,4] },
    ],
  },
  {
    name: '파인힐스 컨트리클럽', location: '경기',
    courses: [
      { name: '파인', pars: [4,4,3,4,5,4,3,5,4] },
      { name: '힐스', pars: [4,3,4,5,4,4,3,5,4] },
    ],
  },
  {
    name: '수원 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '양지파인 컨트리클럽', location: '경기',
    courses: [
      { name: '파인',  pars: [4,3,4,5,4,4,3,5,4] },
      { name: '레이크', pars: [4,4,3,5,4,3,4,5,4] },
      { name: '힐',    pars: [4,4,3,4,5,4,3,5,4] },
    ],
  },
  {
    name: '88 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '남서울 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '화성 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '기흥 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '이천 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '광주 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PF },
    ],
  },
  {
    name: '용인 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '성남 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PE },
    ],
  },
  {
    name: '곤지암 리조트 골프클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '해슬리 나인브릿지', location: '경기',
    courses: [
      { name: '아웃', pars: [4,4,3,5,4,3,4,5,4] },
      { name: '인',   pars: [4,4,3,4,5,4,3,5,4] },
    ],
  },
  {
    name: '영동 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '양평 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '여주 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '안성 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PE },
    ],
  },
  {
    name: '평택 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PF },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '화천 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '분당 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '김포 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '드래곤힐 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PF },
    ],
  },
  {
    name: '렉싱턴 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: [4,4,3,5,4,3,4,5,4] },
      { name: '인',   pars: [4,3,4,5,4,4,3,5,4] },
    ],
  },
  {
    name: '동서울 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '오크힐스 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '시화 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PE },
    ],
  },
  {
    name: '지산 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PF },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '한국 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '신라 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '에버딘 골프클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '보라 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PF },
    ],
  },
  {
    name: '산내들 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '경기 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '가나 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '팜스프링스 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '솔라고 컨트리클럽', location: '경기',
    courses: [
      { name: '레이크',   pars: PA },
      { name: '포레스트', pars: PC },
    ],
  },
  {
    name: '트리마제 골프클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PF },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '왈츠와닥터만 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PE },
    ],
  },
  {
    name: '중앙 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PG },
    ],
  },
  {
    name: '세인트 포 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '이글밸리 골프클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PE },
    ],
  },
  {
    name: '정산 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '포레스트힐스 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PF },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '천마산 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '선선 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '장호원 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '삼성 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PE },
    ],
  },
  {
    name: '서서울 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PF },
    ],
  },
  {
    name: '메트로폴리탄 클럽', location: '경기',
    courses: [
      { name: '아웃', pars: [4,4,3,5,4,3,4,5,4] },
      { name: '인',   pars: [4,4,3,4,5,4,3,5,4] },
    ],
  },
  {
    name: '사우스스프링스 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '노블 컨트리클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '미스터나이스 골프클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PB },
    ],
  },

  // ── 인천 ─────────────────────────────────────────────────
  {
    name: '스카이72 골프클럽', location: '인천',
    courses: [
      { name: '하늘',  pars: [4,3,4,5,4,4,3,5,4] },
      { name: '오션',  pars: [4,4,3,5,4,3,4,5,4] },
      { name: '레이크', pars: [4,4,3,5,4,4,3,4,5] },
      { name: '클래식', pars: [4,3,5,4,4,3,4,5,4] },
    ],
  },
  {
    name: '베어스베스트 청라', location: '인천',
    courses: [
      { name: '아웃', pars: [4,4,3,5,4,3,4,5,4] },
      { name: '인',   pars: [4,3,4,5,4,4,3,5,4] },
    ],
  },
  {
    name: '인천 컨트리클럽', location: '인천',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '강화 컨트리클럽', location: '인천',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '영종 컨트리클럽', location: '인천',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '청라 컨트리클럽', location: '인천',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PF },
    ],
  },

  // ── 강원 ─────────────────────────────────────────────────
  {
    name: '휘닉스 파크 골프클럽', location: '강원',
    courses: [
      { name: '파인', pars: [4,4,3,5,4,4,3,4,5] },
      { name: '버치', pars: [4,4,3,5,4,4,3,4,5] },
    ],
  },
  {
    name: '오크밸리 컨트리클럽', location: '강원',
    courses: [
      { name: '밸리', pars: [4,3,5,4,4,3,4,5,4] },
      { name: '오크', pars: [4,3,4,5,4,4,3,5,4] },
    ],
  },
  {
    name: '알펜시아 골프클럽', location: '강원',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '엘리시안 강촌 컨트리클럽', location: '강원',
    courses: [
      { name: '아웃', pars: [4,4,3,5,4,4,3,4,5] },
      { name: '인',   pars: [4,3,5,4,4,3,4,5,4] },
    ],
  },
  {
    name: '웰리힐리파크 골프클럽', location: '강원',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '비발디파크 골프클럽', location: '강원',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '설악 컨트리클럽', location: '강원',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '소노펠리체 골프클럽', location: '강원',
    courses: [
      { name: '아웃', pars: PF },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '켄싱턴 로제 컨트리클럽', location: '강원',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '속초 컨트리클럽', location: '강원',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PE },
    ],
  },
  {
    name: '양양 컨트리클럽', location: '강원',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '강릉 컨트리클럽', location: '강원',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PF },
    ],
  },
  {
    name: '동해 컨트리클럽', location: '강원',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '삼척 컨트리클럽', location: '강원',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '정선 하이원 컨트리클럽', location: '강원',
    courses: [
      { name: '아웃', pars: [4,4,3,5,4,3,4,5,4] },
      { name: '인',   pars: [4,3,4,5,4,4,3,5,4] },
    ],
  },
  {
    name: '홍천 컨트리클럽', location: '강원',
    courses: [
      { name: '아웃', pars: PF },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '횡성 컨트리클럽', location: '강원',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PG },
    ],
  },
  {
    name: '원주 컨트리클럽', location: '강원',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PE },
    ],
  },
  {
    name: '춘천 리버사이드 컨트리클럽', location: '강원',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '남춘천 컨트리클럽', location: '강원',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PF },
    ],
  },
  {
    name: '평창 컨트리클럽', location: '강원',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '골든밸리 컨트리클럽', location: '강원',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '한화 리조트 설악 컨트리클럽', location: '강원',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PD },
    ],
  },

  // ── 충청남도 ─────────────────────────────────────────────
  {
    name: '천안 컨트리클럽', location: '충남',
    courses: [
      { name: '아웃', pars: [4,4,3,5,4,4,3,4,5] },
      { name: '인',   pars: [4,3,5,4,4,3,4,5,4] },
    ],
  },
  {
    name: '공주 컨트리클럽', location: '충남',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '당진 컨트리클럽', location: '충남',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PE },
    ],
  },
  {
    name: '서산 컨트리클럽', location: '충남',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '태안 컨트리클럽', location: '충남',
    courses: [
      { name: '아웃', pars: PF },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '보령 컨트리클럽', location: '충남',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '홍성 컨트리클럽', location: '충남',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '아산 컨트리클럽', location: '충남',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '더클래식 골프클럽', location: '충남',
    courses: [
      { name: '아웃', pars: [4,4,3,5,4,3,4,5,4] },
      { name: '인',   pars: [4,3,4,5,4,4,3,5,4] },
    ],
  },
  {
    name: '레이크힐스 순안 컨트리클럽', location: '충남',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '충남 컨트리클럽', location: '충남',
    courses: [
      { name: '아웃', pars: PF },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '파인리조트 골프클럽', location: '충남',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PE },
    ],
  },
  {
    name: '무궁화 컨트리클럽', location: '충남',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '예산 컨트리클럽', location: '충남',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PB },
    ],
  },

  // ── 충청북도 ─────────────────────────────────────────────
  {
    name: '잭니클라우스 골프클럽 코리아', location: '충북',
    courses: [
      { name: 'A코스', pars: [4,4,3,5,4,3,4,5,4] },
      { name: 'B코스', pars: [4,4,3,5,4,3,4,5,4] },
      { name: 'C코스', pars: [4,3,4,5,4,4,3,5,4] },
    ],
  },
  {
    name: '충주 컨트리클럽', location: '충북',
    courses: [
      { name: '아웃', pars: [4,4,3,5,4,3,4,5,4] },
      { name: '인',   pars: [4,3,4,5,4,4,3,5,4] },
    ],
  },
  {
    name: '청주 컨트리클럽', location: '충북',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '제천 컨트리클럽', location: '충북',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PE },
    ],
  },
  {
    name: '괴산 컨트리클럽', location: '충북',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '옥천 컨트리클럽', location: '충북',
    courses: [
      { name: '아웃', pars: PF },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '영동 골프클럽', location: '충북',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '음성 컨트리클럽', location: '충북',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PG },
    ],
  },
  {
    name: '증평 컨트리클럽', location: '충북',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PF },
    ],
  },

  // ── 대전 ─────────────────────────────────────────────────
  {
    name: '대전 컨트리클럽', location: '대전',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '세종 골프클럽', location: '대전',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '대전 파인힐스 컨트리클럽', location: '대전',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '유성 컨트리클럽', location: '대전',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PF },
    ],
  },

  // ── 전라북도 ─────────────────────────────────────────────
  {
    name: '전주 컨트리클럽', location: '전북',
    courses: [
      { name: '아웃', pars: [4,4,3,5,4,4,3,4,5] },
      { name: '인',   pars: [4,3,5,4,4,3,4,5,4] },
    ],
  },
  {
    name: '군산 컨트리클럽', location: '전북',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '익산 컨트리클럽', location: '전북',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PE },
    ],
  },
  {
    name: '부안 컨트리클럽', location: '전북',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '정읍 컨트리클럽', location: '전북',
    courses: [
      { name: '아웃', pars: PF },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '남원 컨트리클럽', location: '전북',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '진안 컨트리클럽', location: '전북',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PF },
    ],
  },
  {
    name: '무주 컨트리클럽', location: '전북',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '완주 컨트리클럽', location: '전북',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '김제 컨트리클럽', location: '전북',
    courses: [
      { name: '아웃', pars: PG },
      { name: '인',   pars: PE },
    ],
  },

  // ── 전라남도 ─────────────────────────────────────────────
  {
    name: '광주 무등 골프클럽', location: '광주',
    courses: [
      { name: '아웃', pars: [4,3,5,4,4,3,4,5,4] },
      { name: '인',   pars: [4,3,4,5,4,4,3,5,4] },
    ],
  },
  {
    name: '순천 컨트리클럽', location: '전남',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '여수 컨트리클럽', location: '전남',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '목포 컨트리클럽', location: '전남',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '담양 컨트리클럽', location: '전남',
    courses: [
      { name: '아웃', pars: PF },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '해남 컨트리클럽', location: '전남',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PE },
    ],
  },
  {
    name: '보성 컨트리클럽', location: '전남',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PF },
    ],
  },
  {
    name: '나주 컨트리클럽', location: '전남',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PG },
    ],
  },
  {
    name: '영암 컨트리클럽', location: '전남',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '고흥 컨트리클럽', location: '전남',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '진도 컨트리클럽', location: '전남',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '화순 컨트리클럽', location: '전남',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PF },
    ],
  },
  {
    name: '광양 컨트리클럽', location: '전남',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PC },
    ],
  },

  // ── 경상북도 ─────────────────────────────────────────────
  {
    name: '경주 컨트리클럽', location: '경북',
    courses: [
      { name: '아웃', pars: [4,4,3,5,4,3,4,5,4] },
      { name: '인',   pars: [4,3,4,5,4,4,3,5,4] },
    ],
  },
  {
    name: '포항 컨트리클럽', location: '경북',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '안동 컨트리클럽', location: '경북',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '구미 컨트리클럽', location: '경북',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '상주 컨트리클럽', location: '경북',
    courses: [
      { name: '아웃', pars: PF },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '예천 컨트리클럽', location: '경북',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PE },
    ],
  },
  {
    name: '영주 컨트리클럽', location: '경북',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PF },
    ],
  },
  {
    name: '영천 컨트리클럽', location: '경북',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '군위 컨트리클럽', location: '경북',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PE },
    ],
  },
  {
    name: '성주 컨트리클럽', location: '경북',
    courses: [
      { name: '아웃', pars: PG },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '경산 컨트리클럽', location: '경북',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '칠곡 컨트리클럽', location: '경북',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PF },
    ],
  },
  {
    name: '문경 컨트리클럽', location: '경북',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '울진 컨트리클럽', location: '경북',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PG },
    ],
  },
  {
    name: '의성 컨트리클럽', location: '경북',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PC },
    ],
  },

  // ── 대구 ─────────────────────────────────────────────────
  {
    name: '대구 컨트리클럽', location: '대구',
    courses: [
      { name: '아웃', pars: [4,4,3,5,4,4,3,4,5] },
      { name: '인',   pars: [4,3,5,4,4,3,4,5,4] },
    ],
  },
  {
    name: '노블레스 컨트리클럽', location: '대구',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '동촌 컨트리클럽', location: '대구',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '팔공산 컨트리클럽', location: '대구',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '범어 컨트리클럽', location: '대구',
    courses: [
      { name: '아웃', pars: PF },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '비슬산 컨트리클럽', location: '대구',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PD },
    ],
  },

  // ── 경상남도 ─────────────────────────────────────────────
  {
    name: '가야 컨트리클럽', location: '경남',
    courses: [
      { name: '아웃', pars: [4,4,3,5,4,3,4,5,4] },
      { name: '인',   pars: [4,4,3,5,4,4,3,4,5] },
    ],
  },
  {
    name: '남해 골프클럽', location: '경남',
    courses: [
      { name: '아웃', pars: [4,3,5,4,4,3,4,5,4] },
      { name: '인',   pars: [4,3,4,5,4,4,3,5,4] },
    ],
  },
  {
    name: '창원 컨트리클럽', location: '경남',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '진주 컨트리클럽', location: '경남',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '마산 컨트리클럽', location: '경남',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '거제 컨트리클럽', location: '경남',
    courses: [
      { name: '아웃', pars: PF },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '통영 컨트리클럽', location: '경남',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PE },
    ],
  },
  {
    name: '함양 컨트리클럽', location: '경남',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PF },
    ],
  },
  {
    name: '합천 컨트리클럽', location: '경남',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PG },
    ],
  },
  {
    name: '밀양 컨트리클럽', location: '경남',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '양산 컨트리클럽', location: '경남',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '사천 컨트리클럽', location: '경남',
    courses: [
      { name: '아웃', pars: PF },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '롯데스카이힐 거제 컨트리클럽', location: '경남',
    courses: [
      { name: '아웃', pars: [4,4,3,5,4,3,4,5,4] },
      { name: '인',   pars: [4,4,3,4,5,4,3,5,4] },
    ],
  },
  {
    name: '마이다스 밸리 골프클럽', location: '경남',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '고성 컨트리클럽', location: '경남',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '하동 컨트리클럽', location: '경남',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PF },
    ],
  },

  // ── 부산 ─────────────────────────────────────────────────
  {
    name: '동부산 컨트리클럽', location: '부산',
    courses: [
      { name: '아웃', pars: [4,4,3,5,4,4,3,4,5] },
      { name: '인',   pars: [4,3,5,4,4,3,4,5,4] },
    ],
  },
  {
    name: '롯데스카이힐 부산 컨트리클럽', location: '부산',
    courses: [
      { name: '아웃', pars: [4,4,3,5,4,3,4,5,4] },
      { name: '인',   pars: [4,3,4,5,4,4,3,5,4] },
    ],
  },
  {
    name: '해운대 컨트리클럽', location: '부산',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '부산 컨트리클럽', location: '부산',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PE },
    ],
  },
  {
    name: '기장 컨트리클럽', location: '부산',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '통도 환타지아 컨트리클럽', location: '부산',
    courses: [
      { name: '아웃', pars: PF },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '철마 컨트리클럽', location: '부산',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '웅촌 컨트리클럽', location: '부산',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PG },
    ],
  },

  // ── 울산 ─────────────────────────────────────────────────
  {
    name: '울산 컨트리클럽', location: '울산',
    courses: [
      { name: '아웃', pars: [4,4,3,5,4,3,4,5,4] },
      { name: '인',   pars: [4,3,4,5,4,4,3,5,4] },
    ],
  },
  {
    name: '현대 컨트리클럽', location: '울산',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '울주 컨트리클럽', location: '울산',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '반구대 컨트리클럽', location: '울산',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PA },
    ],
  },

  // ── 제주 ─────────────────────────────────────────────────
  {
    name: '클럽 나인브릿지', location: '제주',
    courses: [
      { name: '아웃', pars: [4,4,3,5,4,3,4,5,4] },
      { name: '인',   pars: [4,3,4,5,4,4,3,5,4] },
    ],
  },
  {
    name: '핀크스 골프클럽', location: '제주',
    courses: [
      { name: '아웃', pars: [4,3,4,5,4,4,3,5,4] },
      { name: '인',   pars: [4,3,4,5,4,4,3,5,4] },
    ],
  },
  {
    name: '제주 컨트리클럽', location: '제주',
    courses: [
      { name: '아웃', pars: [4,4,3,5,4,3,4,5,4] },
      { name: '인',   pars: [4,4,3,5,4,3,4,5,4] },
    ],
  },
  {
    name: '롯데스카이힐 제주 컨트리클럽', location: '제주',
    courses: [
      { name: '아웃', pars: [4,4,3,5,4,3,4,5,4] },
      { name: '인',   pars: [4,3,4,5,4,4,3,5,4] },
    ],
  },
  {
    name: '엘리시안 제주 골프클럽', location: '제주',
    courses: [
      { name: '아웃', pars: [4,4,3,5,4,4,3,4,5] },
      { name: '인',   pars: [4,4,3,5,4,3,4,5,4] },
    ],
  },
  {
    name: '해비치 컨트리클럽', location: '제주',
    courses: [
      { name: '아웃', pars: [4,4,3,5,4,3,4,5,4] },
      { name: '인',   pars: [4,4,3,5,4,3,4,5,4] },
    ],
  },
  {
    name: '중문 컨트리클럽', location: '제주',
    courses: [
      { name: '아웃', pars: [4,4,3,5,4,3,4,5,4] },
      { name: '인',   pars: [4,3,4,5,4,4,3,5,4] },
    ],
  },
  {
    name: '아난티 클럽 제주', location: '제주',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '오라 컨트리클럽', location: '제주',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '라헨느 컨트리클럽', location: '제주',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '레이크힐스 제주 컨트리클럽', location: '제주',
    courses: [
      { name: '아웃', pars: PF },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '서귀포 컨트리클럽', location: '제주',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PE },
    ],
  },
  {
    name: '에코랜드 골프클럽', location: '제주',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PF },
    ],
  },
  {
    name: '탐라 컨트리클럽', location: '제주',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PG },
    ],
  },
  {
    name: '제주 파인힐스 골프클럽', location: '제주',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '한라 컨트리클럽', location: '제주',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '골프존 카운티 제주', location: '제주',
    courses: [
      { name: '아웃', pars: PF },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '더클래식 골프클럽 제주', location: '제주',
    courses: [
      { name: '아웃', pars: [4,4,3,5,4,3,4,5,4] },
      { name: '인',   pars: [4,4,3,4,5,4,3,5,4] },
    ],
  },

];

export function searchCourses(query) {
  if (!query || query.trim().length < 1) return [];
  const q = query.trim().toLowerCase();
  return COURSES.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.location.toLowerCase().includes(q)
  ).slice(0, 10);
}
