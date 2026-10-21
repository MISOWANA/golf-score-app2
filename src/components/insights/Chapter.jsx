import { CHAPTERS } from './chapters.js';

// 리포트의 장(章) 소개 한 줄. 장마다 따로 열리는 페이지(탭)라서 번호·제목은 탭이 말해 주고,
// 여기서는 그 장이 답하는 질문만 가볍게 보여 준다.
export function ChapterIntro({ no }) {
  const c = CHAPTERS.find((x) => x.no === no);
  return (
    <div id={c.id} data-role={c.id}
      style={{ fontSize: 12, color: '#8896b0', textAlign: 'center', margin: '2px 0 14px', lineHeight: 1.5, wordBreak: 'keep-all' }}>
      {c.question}
    </div>
  );
}
