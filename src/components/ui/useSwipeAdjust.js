import { useRef, useState } from 'react';

// 가로로 끌어 값을 맞추는 손가락 동작 — 스코어 입력의 거리 칸(SwipeDistance)과 그린 스피드 선택기가 같이 쓴다.
//
// 손가락 동작 구분: 가로로 끌면 값 조절, 세로로 밀면 화면 스크롤(touch-action: pan-y),
// 거의 움직이지 않고 떼면 탭. 예전에는 이 칸 위에서 스크롤 자체가 막혀 있었고,
// 세로로 민 동작이 탭으로 처리돼 스크롤하려다 기본값이 저장됐다.
//
//   base       끌기를 시작할 때의 값 (값이 없으면 출발값)
//   step       한 칸의 크기 (pxPerStep 만큼 끌 때마다 한 칸)
//   clamp      끌어서 나온 값을 범위 · 칸에 맞추는 함수
//   onChange   값이 바뀔 때 (clamp 를 거친 값)
//   onTap      거의 움직이지 않고 뗐을 때
// 반환: { active(끄는 중), bind(칸에 펼쳐 줄 이벤트 핸들러) } — 칸의 style 에는 SWIPE_STYLE 을 함께 쓴다.
const TAP_SLOP = 8;    // 이 안에서 떼면 탭
const DRAG_START = 6;  // 가로로 이만큼 움직이면 끌기 시작

export const SWIPE_STYLE = { cursor: 'ew-resize', touchAction: 'pan-y', userSelect: 'none' };

export function useSwipeAdjust({ base, step, clamp, onChange, onTap, pxPerStep = 4 }) {
  const startPos = useRef(null);       // { x, y }
  const startVal = useRef(base);
  const modeRef = useRef(null);        // null(아직 모름) | 'drag' | 'scroll'
  const [active, setActive] = useState(false);

  const handleStart = (x, y) => { startPos.current = { x, y }; startVal.current = base; modeRef.current = null; setActive(true); };
  const handleMove = (x, y) => {
    if (!startPos.current || modeRef.current === 'scroll') return;
    const dx = x - startPos.current.x;
    const dy = y - startPos.current.y;
    if (modeRef.current == null) {
      // 세로 움직임이 먼저 크면 스크롤로 보고 이 동작은 끝까지 값을 건드리지 않는다.
      if (Math.abs(dy) > TAP_SLOP && Math.abs(dy) >= Math.abs(dx)) { modeRef.current = 'scroll'; setActive(false); return; }
      if (Math.abs(dx) < DRAG_START) return;
      modeRef.current = 'drag';
    }
    onChange(clamp(startVal.current + dx / pxPerStep * step));
  };
  const handleEnd = (x, y) => {
    setActive(false);
    const p = startPos.current;
    startPos.current = null;
    // 떼는 위치로 한 번 더 확인한다 — 스크롤 중에는 움직임 이벤트가 오지 않는 브라우저가 있다.
    const isTap = modeRef.current == null && p && Math.hypot(x - p.x, y - p.y) < TAP_SLOP;
    modeRef.current = null;
    if (isTap) onTap?.();
  };
  const handleCancel = () => { setActive(false); startPos.current = null; modeRef.current = null; };

  const bind = {
    onTouchStart: (e) => handleStart(e.touches[0].clientX, e.touches[0].clientY),
    onTouchMove: (e) => handleMove(e.touches[0].clientX, e.touches[0].clientY),
    // 탭 뒤에 따라오는 가짜 마우스 이벤트로 두 번 입력되지 않게 막는다.
    onTouchEnd: (e) => { e.preventDefault(); const t = e.changedTouches[0]; handleEnd(t.clientX, t.clientY); },
    onTouchCancel: handleCancel,
    onMouseDown: (e) => {
      handleStart(e.clientX, e.clientY);
      const move = (me) => handleMove(me.clientX, me.clientY);
      const up = (ue) => { handleEnd(ue.clientX, ue.clientY); window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
      window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    },
  };

  return { active, bind };
}
