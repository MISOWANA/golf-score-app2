import { splitKoEn } from './koEn.js';

// 섹션 제목 — 한글 이름을 위 줄에, 영문 이름을 그 아래 줄에 작게 둔다.
//   text   'SCORE BREAKDOWN · 스코어 기준 손실' 처럼 "영문 · 한글" 한 줄 문자열 (자동으로 나눈다)
//   en/ko  문구 일부가 계산된 값일 때 직접 넘긴다
//   info   한글 줄 끝에 붙는 (!) 설명 버튼 (InfoNote) — 길면 info 대신 children 으로 넘겨도 된다
// 글자 모양은 여기서 정한다 — 바깥 제목 칸의 대문자·글자 간격 설정에 영향받지 않게 한글 줄은 따로 지정.
const KO = { display: 'block', fontSize: 15, fontWeight: 800, color: '#b4c0d8', letterSpacing: '0.01em', textTransform: 'none', lineHeight: 1.35 };
const EN = { display: 'block', fontSize: 12, fontWeight: 700, color: '#8aa0c4', letterSpacing: '0.2em', textTransform: 'uppercase', lineHeight: 1.3, marginTop: 3 };

export default function KoEnTitle({ text, en, ko, info = null, children = null }) {
  const parts = text != null ? splitKoEn(text) : { en, ko };
  const tail = children ?? info;
  if (!parts.en) return <>{parts.ko}{tail}</>;   // 영문 이름이 없으면 한 줄 그대로
  return (
    <>
      <span data-role="title-ko" style={KO}>{parts.ko}{tail}</span>
      <span data-role="title-en" style={EN}>{parts.en}</span>
    </>
  );
}
