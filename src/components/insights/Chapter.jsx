import { ChevronRight } from 'lucide-react';
import { CHAPTERS } from './chapters.js';

// 리포트의 장(章) 소개 한 줄. 장마다 따로 열리는 페이지(탭)라서 번호·제목은 탭이 말해 주고,
// 여기서는 그 장이 답하는 질문만 가볍게 보여 준다.
export function ChapterIntro({ no, past = false }) {
  const c = CHAPTERS.find((x) => x.no === no);
  return (
    <div id={c.id} data-role={c.id}
      style={{ fontSize: 14, color: '#4e5968', textAlign: 'center', margin: '2px 0 14px', lineHeight: 1.5, wordBreak: 'keep-all' }}>
      {past ? c.question.replace('이번 라운드', '이 라운드') : c.question}
    </div>
  );
}

// 페이지 맨 아래의 '다음 장' 버튼 — 장이 페이지로 나뉘어도 종합 → 타수 득실 → 빅 미스 … 순서로 이어 읽게 한다.
// 마지막 장에는 없다.
export function NextChapter({ current, onGo }) {
  const next = CHAPTERS[CHAPTERS.findIndex((c) => c.key === current) + 1];
  if (!next) return null;
  return (
    <button type="button" data-role="next-chapter" onClick={() => onGo(next.key)}
      style={{ width: '100%', height: 52, marginTop: 6, padding: '0 16px', borderRadius: 14, background: '#eef1f4', border: '1px solid #d1d6db', color: '#191f28', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#4e5968', whiteSpace: 'nowrap' }}>다음 장</span>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 800 }}>
        <span aria-hidden="true" style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(27,100,218,0.18)', color: '#1b64da', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{next.no}</span>
        {next.short}
      </span>
      <ChevronRight size={18} color="#4e5968" aria-hidden="true" />
    </button>
  );
}
