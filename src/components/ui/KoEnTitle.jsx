import { splitKoEn } from './koEn.js';

// 섹션 제목 — 한글 이름만 보인다 (예전의 영문 대문자 줄은 없앴다: 한 화면 한 가지, 말은 한 번만).
//   text   'SCORE BREAKDOWN · 스코어 기준 손실' 처럼 "영문 · 한글" 한 줄 문자열 (한글만 쓴다)
//   en/ko  호출하는 쪽 모양을 그대로 받되 en 은 쓰지 않는다
//   info   한글 줄 끝에 붙는 (!) 설명 버튼 (InfoNote) — 길면 info 대신 children 으로 넘겨도 된다
// 글자 모양은 여기서 정한다 — 바깥 제목 칸의 대문자·글자 간격 설정에 영향받지 않게 따로 지정.
const KO = { display: 'block', textAlign: 'left', fontSize: 16, fontWeight: 800, color: '#191f28', letterSpacing: '-0.01em', textTransform: 'none', lineHeight: 1.4 };

export default function KoEnTitle({ text, en, ko, info = null, children = null }) {
  const parts = text != null ? splitKoEn(text) : { en, ko };
  const tail = children ?? info;
  const label = parts.ko ?? parts.en;
  return <span data-role="title-ko" style={KO}>{label}{tail}</span>;
}
