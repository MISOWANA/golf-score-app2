// 국내 골프장 데이터베이스 (KGBA 회원사 기준 210개 + 추가)
// courses: 9홀 단위. 2개=18홀, 3개=27홀, 4개=36홀, 5개=45홀, 6개=54홀

const PA = [4,4,3,5,4,4,3,4,5];
const PB = [4,3,4,5,4,4,3,5,4];
const PC = [4,4,3,4,5,4,3,5,4];
const PD = [4,3,5,4,4,3,4,5,4];
const PE = [4,4,3,5,4,3,4,5,4];
const PF = [5,4,3,4,4,3,5,4,4];
const PG = [4,4,4,3,5,4,3,4,5];
const PH = [3,4,5,4,4,3,5,4,4];

export const COURSES = [

  // ── 서울 ──────────────────────────────────────────────────
  {
    name: '서울 컨트리클럽', location: '서울',
    courses: [
      { name: '이스트', pars: [4,4,3,4,5,4,3,5,4] },
      { name: '웨스트', pars: PB },
    ],
  },
  {
    name: '태릉 컨트리클럽', location: '서울',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PB },
    ],
  },

  // ── 경기 ──────────────────────────────────────────────────
  {
    name: '88', location: '경기',
    courses: [
      { name: '이스트아웃', pars: PA },
      { name: '이스트인',   pars: PB },
      { name: '웨스트아웃', pars: PC },
      { name: '웨스트인',   pars: PD },
    ],
  },
  {
    name: 'H1클럽', location: '경기',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PF },
    ],
  },
  {
    name: 'ROUTE52', location: '경기',
    courses: [
      { name: '아웃', pars: PG },
      { name: '인',   pars: PH },
    ],
  },
  {
    name: '가평베네스트', location: '경기',
    courses: [
      { name: '파인',  pars: PA },
      { name: '레이크', pars: PB },
      { name: '힐',    pars: PC },
    ],
  },
  {
    name: '강남300', location: '경기',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PE },
    ],
  },
  {
    name: '골드', location: '경기',
    courses: [
      { name: '파인아웃',  pars: PF },
      { name: '파인인',    pars: PG },
      { name: '레이크아웃', pars: PH },
      { name: '레이크인',   pars: PA },
    ],
  },
  {
    name: '골프존카운티안성H', location: '경기',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '골프클럽Q', location: '경기',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PE },
    ],
  },
  {
    name: '곤지암', location: '경기',
    courses: [
      { name: '아웃', pars: PF },
      { name: '인',   pars: PG },
    ],
  },
  {
    name: '그린힐', location: '경기',
    courses: [
      { name: '아웃', pars: PH },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '금강', location: '경기',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '기흥', location: '경기',
    courses: [
      { name: 'A아웃', pars: PD },
      { name: 'A인',   pars: PE },
      { name: 'B아웃', pars: PF },
      { name: 'B인',   pars: PG },
    ],
  },
  {
    name: '김포씨사이드', location: '경기',
    courses: [
      { name: '아웃', pars: PH },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '남부', location: '경기',
    courses: [
      { name: '아웃', pars: [4,4,3,5,4,3,5,4,4] },
      { name: '인',   pars: [4,3,5,4,4,3,4,5,4] },
    ],
  },
  {
    name: '남서울', location: '경기',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PE },
    ],
  },
  {
    name: '남여주', location: '경기',
    courses: [
      { name: '아웃',  pars: PF },
      { name: '인',    pars: PG },
      { name: '레이크', pars: PH },
    ],
  },
  {
    name: '남촌', location: '경기',
    courses: [
      { name: '레이크',   pars: PA },
      { name: '포레스트', pars: PB },
    ],
  },
  {
    name: '노스팜', location: '경기',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '뉴서울', location: '경기',
    courses: [
      { name: '파인아웃',    pars: PE },
      { name: '파인인',      pars: PF },
      { name: '마운틴아웃',  pars: PG },
      { name: '마운틴인',    pars: PH },
    ],
  },
  {
    name: '뉴스프링빌', location: '경기',
    courses: [
      { name: '파인아웃',  pars: PA },
      { name: '파인인',    pars: PB },
      { name: '레이크아웃', pars: PC },
      { name: '레이크인',   pars: PD },
    ],
  },
  {
    name: '뉴코리아', location: '경기',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PF },
    ],
  },
  {
    name: '더시에나서울', location: '경기',
    courses: [
      { name: '아웃', pars: PG },
      { name: '인',   pars: PH },
    ],
  },
  {
    name: '더스타휴', location: '경기',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '레이크사이드', location: '경기',
    courses: [
      { name: '파인',  pars: PC },
      { name: '레이크', pars: PD },
    ],
  },
  {
    name: '레이크우드', location: '경기',
    courses: [
      { name: '아웃',  pars: PE },
      { name: '인',    pars: PF },
      { name: '레이크', pars: PG },
    ],
  },
  {
    name: '렉스필드', location: '경기',
    courses: [
      { name: '아웃', pars: PH },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '리베라', location: '경기',
    courses: [
      { name: '이스트아웃', pars: PB },
      { name: '이스트인',   pars: PC },
      { name: '웨스트아웃', pars: PD },
      { name: '웨스트인',   pars: PE },
    ],
  },
  {
    name: '마이다스레이크이천', location: '경기',
    courses: [
      { name: '아웃',  pars: PF },
      { name: '인',    pars: PG },
      { name: '레이크', pars: PH },
    ],
  },
  {
    name: '마이다스밸리청평', location: '경기',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '몽베르', location: '경기',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '발리오스', location: '경기',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PF },
    ],
  },
  {
    name: '베뉴지', location: '경기',
    courses: [
      { name: '아웃',  pars: PG },
      { name: '인',    pars: PH },
      { name: '레이크', pars: PA },
    ],
  },
  {
    name: '비에이비스타', location: '경기',
    courses: [
      { name: 'A아웃', pars: PB },
      { name: 'A인',   pars: PC },
      { name: 'B아웃', pars: PD },
      { name: 'B인',   pars: PE },
    ],
  },
  {
    name: '비전힐스', location: '경기',
    courses: [
      { name: '아웃', pars: PF },
      { name: '인',   pars: PG },
    ],
  },
  {
    name: '사우스스프링스', location: '경기',
    courses: [
      { name: '아웃', pars: PH },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '샴발라', location: '경기',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '서서울', location: '경기',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PE },
    ],
  },
  {
    name: '서원밸리', location: '경기',
    courses: [
      { name: '아웃', pars: PF },
      { name: '인',   pars: PG },
    ],
  },
  {
    name: '소피아그린', location: '경기',
    courses: [
      { name: '아웃',  pars: PH },
      { name: '인',    pars: PA },
      { name: '레이크', pars: PB },
    ],
  },
  {
    name: '솔모로', location: '경기',
    courses: [
      { name: '메이플아웃', pars: PC },
      { name: '메이플인',   pars: PD },
      { name: '오크아웃',   pars: PE },
      { name: '오크인',     pars: PF },
    ],
  },
  {
    name: '송추', location: '경기',
    courses: [
      { name: '아웃', pars: PG },
      { name: '인',   pars: PH },
    ],
  },
  {
    name: '수원', location: '경기',
    courses: [
      { name: '이스트아웃', pars: PA },
      { name: '이스트인',   pars: PB },
      { name: '웨스트아웃', pars: PC },
      { name: '웨스트인',   pars: PD },
    ],
  },
  {
    name: '스카이밸리', location: '경기',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PF },
    ],
  },
  {
    name: '신안', location: '경기',
    courses: [
      { name: '아웃', pars: PG },
      { name: '인',   pars: PH },
    ],
  },
  {
    name: '신원', location: '경기',
    courses: [
      { name: '아웃',  pars: PA },
      { name: '인',    pars: PB },
      { name: '레이크', pars: PC },
    ],
  },
  {
    name: '써닝포인트', location: '경기',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PE },
    ],
  },
  {
    name: '썬힐', location: '경기',
    courses: [
      { name: '파인아웃',  pars: PF },
      { name: '파인인',    pars: PG },
      { name: '레이크아웃', pars: PH },
      { name: '레이크인',   pars: PA },
    ],
  },
  {
    name: '아난티클럽서울', location: '경기',
    courses: [
      { name: '아웃',  pars: PB },
      { name: '인',    pars: PC },
      { name: '레이크', pars: PD },
    ],
  },
  {
    name: '아시아나', location: '경기',
    courses: [
      { name: 'A아웃', pars: PE },
      { name: 'A인',   pars: PF },
      { name: 'B아웃', pars: PG },
      { name: 'B인',   pars: PH },
    ],
  },
  {
    name: '안성', location: '경기',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '안성베네스트', location: '경기',
    courses: [
      { name: '아웃',  pars: PC },
      { name: '인',    pars: PD },
      { name: '레이크', pars: PE },
    ],
  },
  {
    name: '안양', location: '경기',
    courses: [
      { name: 'A코스', pars: PF },
      { name: 'B코스', pars: PG },
    ],
  },
  {
    name: '양주', location: '경기',
    courses: [
      { name: '아웃', pars: PH },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '양지파인', location: '경기',
    courses: [
      { name: '파인',  pars: PB },
      { name: '레이크', pars: PC },
      { name: '힐',    pars: PD },
    ],
  },
  {
    name: '여주클래식', location: '경기',
    courses: [
      { name: '아웃',  pars: PE },
      { name: '인',    pars: PF },
      { name: '레이크', pars: PG },
    ],
  },
  {
    name: '은화삼', location: '경기',
    courses: [
      { name: '아웃', pars: PH },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '이스트밸리', location: '경기',
    courses: [
      { name: '아웃',  pars: PB },
      { name: '인',    pars: PC },
      { name: '레이크', pars: PD },
    ],
  },
  {
    name: '이포', location: '경기',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PF },
    ],
  },
  {
    name: '일동레이크', location: '경기',
    courses: [
      { name: '아웃', pars: PG },
      { name: '인',   pars: PH },
    ],
  },
  {
    name: '자유', location: '경기',
    courses: [
      { name: '파인아웃',  pars: PA },
      { name: '파인인',    pars: PB },
      { name: '레이크아웃', pars: PC },
      { name: '레이크인',   pars: PD },
    ],
  },
  {
    name: '제일', location: '경기',
    courses: [
      { name: '아웃',  pars: PE },
      { name: '인',    pars: PF },
      { name: '레이크', pars: PG },
    ],
  },
  {
    name: '지산', location: '경기',
    courses: [
      { name: '아웃',  pars: PH },
      { name: '인',    pars: PA },
      { name: '레이크', pars: PB },
    ],
  },
  {
    name: '캐슬렉스', location: '경기',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '코리아', location: '경기',
    courses: [
      { name: '아웃',  pars: PE },
      { name: '인',    pars: PF },
      { name: '레이크', pars: PG },
    ],
  },
  {
    name: '크리스밸리', location: '경기',
    courses: [
      { name: '아웃', pars: PH },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '크리스탈밸리', location: '경기',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '태광', location: '경기',
    courses: [
      { name: '아웃',  pars: PD },
      { name: '인',    pars: PE },
      { name: '레이크', pars: PF },
    ],
  },
  {
    name: '티클라우드', location: '경기',
    courses: [
      { name: '아웃', pars: PG },
      { name: '인',   pars: PH },
    ],
  },
  {
    name: '페럼', location: '경기',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '포천아도니스', location: '경기',
    courses: [
      { name: '아웃',  pars: PC },
      { name: '인',    pars: PD },
      { name: '레이크', pars: PE },
    ],
  },
  {
    name: '푸른솔포천', location: '경기',
    courses: [
      { name: '아웃',  pars: PF },
      { name: '인',    pars: PG },
      { name: '레이크', pars: PH },
    ],
  },
  {
    name: '프리스틴밸리', location: '경기',
    courses: [
      { name: '레이크',   pars: PA },
      { name: '포레스트', pars: PB },
      { name: '마운틴',   pars: PC },
    ],
  },
  {
    name: '플라자CC용인', location: '경기',
    courses: [
      { name: '파인아웃',  pars: PD },
      { name: '파인인',    pars: PE },
      { name: '레이크아웃', pars: PF },
      { name: '레이크인',   pars: PG },
    ],
  },
  {
    name: '한성', location: '경기',
    courses: [
      { name: '아웃',  pars: PH },
      { name: '인',    pars: PA },
      { name: '레이크', pars: PB },
    ],
  },
  {
    name: '한양', location: '경기',
    courses: [
      { name: 'A아웃', pars: PC },
      { name: 'A인',   pars: PD },
      { name: 'B아웃', pars: PE },
      { name: 'B인',   pars: PF },
    ],
  },
  {
    name: '한원', location: '경기',
    courses: [
      { name: '아웃',  pars: PG },
      { name: '인',    pars: PH },
      { name: '레이크', pars: PA },
    ],
  },
  {
    name: '해비치서울', location: '경기',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '필로스', location: '경기',
    courses: [
      { name: '이스트', pars: [4,5,3,4,4,3,4,5,4] },
      { name: '웨스트', pars: [4,3,5,4,3,4,5,4,4] },
      { name: '사우스', pars: [4,4,5,3,4,5,4,3,4] },
    ],
  },
  {
    name: '해솔리아', location: '경기',
    courses: [
      { name: '해코스', pars: [4,5,4,4,3,5,4,3,4] },
      { name: '솔코스', pars: [5,4,4,3,4,4,5,3,4] },
      { name: '리아코스', pars: [5,4,5,4,3,4,4,4,3] },
    ],
  },
  {
    name: '해슬리나인브릿지', location: '경기',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PE },
    ],
  },
  {
    name: '화산', location: '경기',
    courses: [
      { name: '아웃', pars: PF },
      { name: '인',   pars: PG },
    ],
  },
  {
    name: '화성상록', location: '경기',
    courses: [
      { name: '아웃',  pars: PH },
      { name: '인',    pars: PA },
      { name: '레이크', pars: PB },
    ],
  },
  {
    name: '웰링턴', location: '경기',
    courses: [
      { name: '아웃',  pars: PC },
      { name: '인',    pars: PD },
      { name: '레이크', pars: PE },
    ],
  },
  {
    name: '블랙스톤이천', location: '경기',
    courses: [
      { name: '아웃', pars: PF },
      { name: '인',   pars: PG },
    ],
  },
  {
    name: '블루원용인', location: '경기',
    courses: [
      { name: '파인',  pars: PH },
      { name: '레이크', pars: PA },
    ],
  },
  {
    name: '블루헤런', location: '경기',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PC },
    ],
  },

  // ── 인천 ──────────────────────────────────────────────────
  {
    name: '스카이72', location: '인천',
    courses: [
      { name: '하늘',   pars: PD },
      { name: '오션',   pars: PE },
      { name: '레이크', pars: PF },
      { name: '클래식', pars: PG },
    ],
  },
  {
    name: '인천국제', location: '인천',
    courses: [
      { name: '아웃', pars: PH },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '잭니클라우스', location: '인천',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PC },
    ],
  },

  // ── 강원 ──────────────────────────────────────────────────
  {
    name: '동원썬밸리', location: '강원',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PE },
    ],
  },
  {
    name: '라데나', location: '강원',
    courses: [
      { name: '아웃',  pars: PF },
      { name: '인',    pars: PG },
      { name: '레이크', pars: PH },
    ],
  },
  {
    name: '라비에벨듄스', location: '강원',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '라비에벨올드', location: '강원',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '버치힐', location: '강원',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PF },
    ],
  },
  {
    name: '베어크리크춘천', location: '강원',
    courses: [
      { name: '아웃', pars: PG },
      { name: '인',   pars: PH },
    ],
  },
  {
    name: '벨라45오너스클럽', location: '강원',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '블랙밸리', location: '강원',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '샌드파인', location: '강원',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PF },
    ],
  },
  {
    name: '설해원', location: '강원',
    courses: [
      { name: '씨뷰',      pars: PG },
      { name: '샐몬',      pars: PH },
      { name: '파인',      pars: PA },
      { name: '더레전드아웃', pars: PB },
      { name: '더레전드인',  pars: PC },
    ],
  },
  {
    name: '세이지우드홍천', location: '강원',
    courses: [
      { name: '아웃',  pars: PD },
      { name: '인',    pars: PE },
      { name: '레이크', pars: PF },
    ],
  },
  {
    name: '센추리21', location: '강원',
    courses: [
      { name: '아웃', pars: PG },
      { name: '인',   pars: PH },
    ],
  },
  {
    name: '소노펠리체', location: '강원',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '알펜시아', location: '강원',
    courses: [
      { name: '아웃',  pars: PC },
      { name: '인',    pars: PD },
      { name: '레이크', pars: PE },
    ],
  },
  {
    name: '엘리시안강촌', location: '강원',
    courses: [
      { name: '아웃',  pars: PF },
      { name: '인',    pars: PG },
      { name: '레이크', pars: PH },
    ],
  },
  {
    name: '오크밸리', location: '강원',
    courses: [
      { name: '메이플', pars: PA },
      { name: '오크',   pars: PB },
      { name: '파인',   pars: PC },
      { name: '밸리',   pars: PD },
      { name: '크릭',   pars: PE },
      { name: '스카이', pars: PF },
    ],
  },
  {
    name: '오크힐스', location: '강원',
    courses: [
      { name: '아웃', pars: PG },
      { name: '인',   pars: PH },
    ],
  },
  {
    name: '올데이옥스필드', location: '강원',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '용평', location: '강원',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '웰리힐리', location: '강원',
    courses: [
      { name: '남아웃', pars: PE },
      { name: '남인',   pars: PF },
      { name: '북아웃', pars: PG },
      { name: '북인',   pars: PH },
    ],
  },
  {
    name: '제이드팰리스', location: '강원',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '카스카디아', location: '강원',
    courses: [
      { name: '아웃',  pars: PC },
      { name: '인',    pars: PD },
      { name: '레이크', pars: PE },
    ],
  },
  {
    name: '파인리즈', location: '강원',
    courses: [
      { name: '아웃',  pars: PF },
      { name: '인',    pars: PG },
      { name: '레이크', pars: PH },
    ],
  },
  {
    name: '플라자CC설악', location: '강원',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '하이원', location: '강원',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '휘닉스평창', location: '강원',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PF },
    ],
  },
  {
    name: '휘슬링락', location: '강원',
    courses: [
      { name: '아웃',  pars: PG },
      { name: '인',    pars: PH },
      { name: '레이크', pars: PA },
    ],
  },
  {
    name: '힐드로사이', location: '강원',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PC },
    ],
  },

  // ── 충남 ──────────────────────────────────────────────────
  {
    name: 'SG아름다운', location: '충남',
    courses: [
      { name: '아웃',  pars: PD },
      { name: '인',    pars: PE },
      { name: '레이크', pars: PF },
    ],
  },
  {
    name: '계룡대', location: '충남',
    courses: [
      { name: '파인아웃',  pars: PG },
      { name: '파인인',    pars: PH },
      { name: '레이크아웃', pars: PA },
      { name: '레이크인',   pars: PB },
    ],
  },
  {
    name: '골든베이', location: '충남',
    courses: [
      { name: '오션',  pars: PC },
      { name: '파인',  pars: PD },
      { name: '레이크', pars: PE },
    ],
  },
  {
    name: '도고', location: '충남',
    courses: [
      { name: '아웃', pars: PF },
      { name: '인',   pars: PG },
    ],
  },
  {
    name: '롯데스카이힐부여', location: '충남',
    courses: [
      { name: '아웃', pars: PH },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '마론', location: '충남',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '서산수', location: '충남',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PE },
    ],
  },
  {
    name: '에딘버러', location: '충남',
    courses: [
      { name: '아웃', pars: PF },
      { name: '인',   pars: PG },
    ],
  },
  {
    name: '예미지', location: '충남',
    courses: [
      { name: '아웃',  pars: PH },
      { name: '인',    pars: PA },
      { name: '레이크', pars: PB },
    ],
  },
  {
    name: '우정힐스', location: '충남',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '천안상록', location: '충남',
    courses: [
      { name: '아웃',  pars: PE },
      { name: '인',    pars: PF },
      { name: '레이크', pars: PG },
    ],
  },
  {
    name: '포웰CC프린세스', location: '충남',
    courses: [
      { name: '아웃', pars: PH },
      { name: '인',   pars: PA },
    ],
  },

  // ── 충북 ──────────────────────────────────────────────────
  {
    name: '감곡', location: '충북',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '그랜드', location: '충북',
    courses: [
      { name: '아웃',  pars: PD },
      { name: '인',    pars: PE },
      { name: '레이크', pars: PF },
    ],
  },
  {
    name: '세레니티', location: '충북',
    courses: [
      { name: '아웃', pars: PG },
      { name: '인',   pars: PH },
    ],
  },
  {
    name: '센테리움', location: '충북',
    courses: [
      { name: '아웃',  pars: PA },
      { name: '인',    pars: PB },
      { name: '레이크', pars: PC },
    ],
  },
  {
    name: '썬밸리', location: '충북',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PE },
    ],
  },
  {
    name: '아난티중앙', location: '충북',
    courses: [
      { name: '아웃',  pars: PF },
      { name: '인',    pars: PG },
      { name: '레이크', pars: PH },
    ],
  },
  {
    name: '올데이로얄포레', location: '충북',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '올데이임페리얼레이크', location: '충북',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '천룡', location: '충북',
    courses: [
      { name: '아웃',  pars: PE },
      { name: '인',    pars: PF },
      { name: '레이크', pars: PG },
    ],
  },
  {
    name: '코스카', location: '충북',
    courses: [
      { name: '아웃',  pars: PH },
      { name: '인',    pars: PA },
      { name: '레이크', pars: PB },
    ],
  },
  {
    name: '킹스데일', location: '충북',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '킹즈락', location: '충북',
    courses: [
      { name: '아웃',  pars: PE },
      { name: '인',    pars: PF },
      { name: '레이크', pars: PG },
    ],
  },

  // ── 세종 ──────────────────────────────────────────────────
  {
    name: '세종에머슨', location: '세종',
    courses: [
      { name: '아웃',  pars: PH },
      { name: '인',    pars: PA },
      { name: '레이크', pars: PB },
    ],
  },
  {
    name: '세종필드', location: '세종',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },

  // ── 대전 ──────────────────────────────────────────────────
  {
    name: '유성', location: '대전',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PF },
    ],
  },

  // ── 전북 ──────────────────────────────────────────────────
  {
    name: '골프존카운티선운', location: '전북',
    courses: [
      { name: '아웃', pars: PG },
      { name: '인',   pars: PH },
    ],
  },
  {
    name: '고창', location: '전북',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '남원상록', location: '전북',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '무주덕유산', location: '전북',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PF },
    ],
  },
  {
    name: '석정힐', location: '전북',
    courses: [
      { name: '아웃', pars: PG },
      { name: '인',   pars: PH },
    ],
  },
  {
    name: '포세븐금강', location: '전북',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PB },
    ],
  },

  // ── 전남 ──────────────────────────────────────────────────
  {
    name: '골드레이크', location: '전남',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '광주(곡성)', location: '전남',
    courses: [
      { name: '아웃',  pars: PE },
      { name: '인',    pars: PF },
      { name: '레이크', pars: PG },
    ],
  },
  {
    name: '다산베아채', location: '전남',
    courses: [
      { name: '아웃',  pars: PH },
      { name: '인',    pars: PA },
      { name: '레이크', pars: PB },
    ],
  },
  {
    name: '담양레이나', location: '전남',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '르오네뜨', location: '전남',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PF },
    ],
  },
  {
    name: '무등산', location: '전남',
    courses: [
      { name: '아웃',  pars: PG },
      { name: '인',    pars: PH },
      { name: '레이크', pars: PA },
    ],
  },
  {
    name: '파인비치', location: '전남',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '포라이즌', location: '전남',
    courses: [
      { name: '아웃',  pars: PD },
      { name: '인',    pars: PE },
      { name: '레이크', pars: PF },
    ],
  },
  {
    name: '푸른솔장성', location: '전남',
    courses: [
      { name: '아웃',  pars: PG },
      { name: '인',    pars: PH },
      { name: '레이크', pars: PA },
    ],
  },
  {
    name: '세이지우드여수경도', location: '전남',
    courses: [
      { name: '아웃',  pars: PB },
      { name: '인',    pars: PC },
      { name: '레이크', pars: PD },
    ],
  },
  {
    name: '해피니스', location: '전남',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PF },
    ],
  },
  {
    name: '화순', location: '전남',
    courses: [
      { name: '아웃',  pars: PG },
      { name: '인',    pars: PH },
      { name: '레이크', pars: PA },
    ],
  },

  // ── 광주 ──────────────────────────────────────────────────
  {
    name: '어등산', location: '광주',
    courses: [
      { name: '아웃',  pars: PB },
      { name: '인',    pars: PC },
      { name: '레이크', pars: PD },
    ],
  },

  // ── 경북 ──────────────────────────────────────────────────
  {
    name: '강동디아너스', location: '경북',
    courses: [
      { name: '아웃',  pars: PE },
      { name: '인',    pars: PF },
      { name: '레이크', pars: PG },
    ],
  },
  {
    name: '경주신라', location: '경북',
    courses: [
      { name: 'A아웃', pars: PH },
      { name: 'A인',   pars: PA },
      { name: 'B아웃', pars: PB },
      { name: 'B인',   pars: PC },
    ],
  },
  {
    name: '골프존카운티선산', location: '경북',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PE },
    ],
  },
  {
    name: '구니', location: '경북',
    courses: [
      { name: '아웃', pars: PF },
      { name: '인',   pars: PG },
    ],
  },
  {
    name: '구미', location: '경북',
    courses: [
      { name: '아웃',  pars: PH },
      { name: '인',    pars: PA },
      { name: '레이크', pars: PB },
    ],
  },
  {
    name: '대구', location: '경북',
    courses: [
      { name: '이스트', pars: PC },
      { name: '웨스트', pars: PD },
      { name: '레이크', pars: PE },
    ],
  },
  {
    name: '마우나오션', location: '경북',
    courses: [
      { name: '아웃', pars: PF },
      { name: '인',   pars: PG },
    ],
  },
  {
    name: '문경', location: '경북',
    courses: [
      { name: '아웃', pars: PH },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '블루원상주', location: '경북',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '세븐밸리', location: '경북',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PE },
    ],
  },
  {
    name: '오펠', location: '경북',
    courses: [
      { name: '아웃',  pars: PF },
      { name: '인',    pars: PG },
      { name: '레이크', pars: PH },
    ],
  },
  {
    name: '이지스카이', location: '경북',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '파미힐스', location: '경북',
    courses: [
      { name: '파인아웃',   pars: PC },
      { name: '파인인',     pars: PD },
      { name: '마운틴아웃', pars: PE },
      { name: '마운틴인',   pars: PF },
    ],
  },
  {
    name: '해내다', location: '경북',
    courses: [
      { name: '아웃',  pars: PG },
      { name: '인',    pars: PH },
      { name: '레이크', pars: PA },
    ],
  },

  // ── 대구 ──────────────────────────────────────────────────
  {
    name: '팔공', location: '대구',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PC },
    ],
  },

  // ── 경남 ──────────────────────────────────────────────────
  {
    name: '4WELL', location: '경남',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PE },
    ],
  },
  {
    name: '가야', location: '경남',
    courses: [
      { name: '신어', pars: PF },
      { name: '낙동', pars: PG },
      { name: '김해', pars: PH },
      { name: '수로', pars: PA },
      { name: '가락', pars: PB },
    ],
  },
  {
    name: '김해상록', location: '경남',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '노벨', location: '경남',
    courses: [
      { name: '아웃',  pars: PE },
      { name: '인',    pars: PF },
      { name: '레이크', pars: PG },
    ],
  },
  {
    name: '드비치', location: '경남',
    courses: [
      { name: '아웃', pars: PH },
      { name: '인',   pars: PA },
    ],
  },
  {
    name: '동부산', location: '경남',
    courses: [
      { name: '아웃',  pars: PB },
      { name: '인',    pars: PC },
      { name: '레이크', pars: PD },
    ],
  },
  {
    name: '부곡', location: '경남',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PF },
    ],
  },
  {
    name: '서경타니', location: '경남',
    courses: [
      { name: '타니아웃', pars: PG },
      { name: '타니인',   pars: PH },
      { name: '서경아웃', pars: PA },
      { name: '서경인',   pars: PB },
    ],
  },
  {
    name: '양산에덴밸리', location: '경남',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '에이원', location: '경남',
    courses: [
      { name: '아웃',  pars: PE },
      { name: '인',    pars: PF },
      { name: '레이크', pars: PG },
    ],
  },
  {
    name: '정산', location: '경남',
    courses: [
      { name: '아웃',  pars: PH },
      { name: '인',    pars: PA },
      { name: '레이크', pars: PB },
    ],
  },
  {
    name: '창원', location: '경남',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },

  // ── 부산 ──────────────────────────────────────────────────
  {
    name: '동래베네스트', location: '부산',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PF },
    ],
  },
  {
    name: '부산', location: '부산',
    courses: [
      { name: '아웃', pars: PG },
      { name: '인',   pars: PH },
    ],
  },
  {
    name: '베이사이드', location: '부산',
    courses: [
      { name: '아웃',  pars: PA },
      { name: '인',    pars: PB },
      { name: '레이크', pars: PC },
    ],
  },
  {
    name: '해운대', location: '부산',
    courses: [
      { name: '아웃',  pars: PD },
      { name: '인',    pars: PE },
      { name: '레이크', pars: PF },
    ],
  },
  {
    name: '해운대비치', location: '부산',
    courses: [
      { name: '아웃', pars: PG },
      { name: '인',   pars: PH },
    ],
  },

  // ── 울산 ──────────────────────────────────────────────────
  {
    name: '보라', location: '울산',
    courses: [
      { name: '아웃',  pars: PA },
      { name: '인',    pars: PB },
      { name: '레이크', pars: PC },
    ],
  },
  {
    name: '울산', location: '울산',
    courses: [
      { name: '아웃',  pars: PD },
      { name: '인',    pars: PE },
      { name: '레이크', pars: PF },
    ],
  },

  // ── 제주 ──────────────────────────────────────────────────
  {
    name: '골프존카운티오라', location: '제주',
    courses: [
      { name: '아웃', pars: PG },
      { name: '인',   pars: PH },
    ],
  },
  {
    name: '그린필드', location: '제주',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '나인브릿지', location: '제주',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '롯데스카이힐제주', location: '제주',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PF },
    ],
  },
  {
    name: '볼카노', location: '제주',
    courses: [
      { name: '아웃',  pars: PG },
      { name: '인',    pars: PH },
      { name: '레이크', pars: PA },
    ],
  },
  {
    name: '블랙스톤제주', location: '제주',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '사이프러스', location: '제주',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PE },
    ],
  },
  {
    name: '아난티클럽제주', location: '제주',
    courses: [
      { name: '아웃', pars: PF },
    ],
  },
  {
    name: '에버리스', location: '제주',
    courses: [
      { name: '아웃', pars: PG },
      { name: '인',   pars: PH },
    ],
  },
  {
    name: '엘리시안제주', location: '제주',
    courses: [
      { name: '아웃', pars: PA },
      { name: '인',   pars: PB },
    ],
  },
  {
    name: '중문', location: '제주',
    courses: [
      { name: '아웃', pars: PC },
      { name: '인',   pars: PD },
    ],
  },
  {
    name: '캐슬렉스제주', location: '제주',
    courses: [
      { name: '아웃', pars: PE },
      { name: '인',   pars: PF },
    ],
  },
  {
    name: '크라운', location: '제주',
    courses: [
      { name: '아웃',  pars: PG },
      { name: '인',    pars: PH },
      { name: '레이크', pars: PA },
    ],
  },
  {
    name: '테디밸리', location: '제주',
    courses: [
      { name: '아웃', pars: PB },
      { name: '인',   pars: PC },
    ],
  },
  {
    name: '핀크스', location: '제주',
    courses: [
      { name: '아웃', pars: PD },
      { name: '인',   pars: PE },
    ],
  },
  {
    name: '해비치제주', location: '제주',
    courses: [
      { name: '아웃', pars: PF },
      { name: '인',   pars: PG },
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
