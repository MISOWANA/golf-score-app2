// @vitest-environment jsdom
// 샷 기록 — 버튼을 누르면 화면이 "다음에 눌러야 할 칸"으로 옮겨 가는지 본다.
// (예전에는 어디를 눌러도 화면 맨 아래로 내려가서, 아래에 있는 전체 스코어 표를 지나쳐 다음 칸을 놓쳤다.)
// 화면 이동은 scrollIntoView 가 불린 칸의 data-step 이름으로 확인한다. 방식은 test/flowKit.jsx 머리말 참고.
import { describe, it, expect, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { tap, tapTab, area, find, newHole, setPar, installHooks, setDistance, currentTab } from './test/flowKit.jsx';

vi.setConfig({ testTimeout: 40000 });
installHooks();

// scrollIntoView 가 불린 칸들을 모은다 (맨 마지막이 지금 화면이 향한 곳)
function watchScroll() {
  const seen = [];
  Element.prototype.scrollIntoView = function () { seen.push(this); };
  window.scrollTo = vi.fn();
  const names = () => seen.map((el) => el.getAttribute?.('data-step')).filter(Boolean);
  return {
    seen,
    names,
    reset: () => { seen.length = 0; window.scrollTo.mockClear(); },
    // 지금까지 불린 것 중 가장 마지막 칸이 name 이 될 때까지 기다린다
    lands: (name) => waitFor(() => expect(names().at(-1), `화면이 향한 곳 ${JSON.stringify(names())}`).toBe(name)),
    // 이 칸으로는 가지 않았다
    never: (name) => expect(names()).not.toContain(name),
  };
}

describe('티샷 — 누르면 다음 칸으로', () => {
  it('파4: 클럽 → 구질 → 페어웨이 O/X → 랜딩, 눌린 칸 바로 다음 칸이 화면 맨 위로 온다 (맨 아래로 가지 않는다)', async () => {
    await newHole();
    const w = watchScroll();
    await tap('DRIVER');
    await w.lands('tee-shape');
    w.reset();
    await tap('스트레이트');
    await w.lands('tee-fairway');
    w.reset();
    await tap('O');
    await w.lands('tee-landing');
    expect(window.scrollTo).not.toHaveBeenCalled();                     // 화면 맨 아래로 내리는 이동이 없다
  });

  it('랜딩을 골랐는데 구질이 비어 있으면 "필드샷 입력하기" 쪽으로, 다 채웠으면 탭이 필드샷으로 넘어간다', async () => {
    await newHole();
    await tap('DRIVER');
    await tap('O');
    const w = watchScroll();
    await tap('L레프트');                                               // 랜딩 L — 구질은 비어 있다
    await w.lands('tee-next');
    expect(currentTab()).toBe('티샷');
    await tap('스트레이트');                                             // 구질까지 채우면 티샷이 끝난다
    await waitFor(() => expect(currentTab()).toBe('필드샷'));
  });

  it('세부 클럽(번호)이 있는 종류는 번호를 고른 뒤에 다음 칸으로 간다 — 번호 줄이 바로 아래에 열리므로 먼저 옮기지 않는다', async () => {
    await newHole();
    const w = watchScroll();
    await tap('HYBRID');
    await new Promise((r) => setTimeout(r, 400));
    w.never('tee-shape');                                               // 번호를 고르기 전에는 움직이지 않는다
    await tap('4H');
    await w.lands('tee-shape');
  });

  it('파3: 클럽 → 구질 → 티샷 결과(그린 온 · 그린 놓침)', async () => {
    await newHole();
    await setPar(0, 3);
    const w = watchScroll();
    await tap('DRIVER');
    await w.lands('tee-shape');
    w.reset();
    await tap('스트레이트');
    await w.lands('tee-result');
  });
});

describe('필드샷 · 퍼팅 — 누르면 다음 칸으로', () => {
  const toField = async () => {
    await newHole();
    await tap('DRIVER'); await tap('스트레이트'); await tap('O');
    await tap(/^필드샷 입력하기/);
  };

  it('세컨샷: 클럽(번호) → 지형 → 라이 → 결과(성공 · 실패 · 칩인)', async () => {
    await toField();
    const w = watchScroll();
    await tap('IRON');
    await new Promise((r) => setTimeout(r, 400));
    w.never('second-surface');
    await tap('7I');
    await w.lands('second-surface');
    w.reset();
    await tap(area('second-surface-rough'));
    await w.lands('second-lie');
    w.reset();
    await tap(area('second-lie-flat'));
    await w.lands('second-result');
  });

  it('퍼팅: 라이를 고르면 "퍼팅 거리" 칸이 화면 맨 위로 오고, 다음 퍼트로 가면 그 퍼트 카드가 맨 위로 온다', async () => {
    await toField();
    await tap('IRON'); await tap('7I');
    await setDistance(area('second-surface').parentElement, 150);
    await tap(area('second-lie-flat'));
    const w = watchScroll();
    await tap(area('second-result-on'));
    expect(currentTab()).toBe('퍼팅');
    await w.lands('putt-pin');                                           // 들어올 때의 이동(80ms 타이머)이 끝난 뒤에 누른다 — 느린 CI 에서 순서가 뒤집히지 않게
    w.reset();
    await tap(area('putt-lie-uphill'));
    await w.lands('putt-distance-0');
    w.reset();
    await tap(area('putt-next'));
    await w.lands('putt-card-1');
  });

  // 세컨샷 "성공"(온그린)까지 간 상태
  const toGreen = async () => {
    await toField();
    await tap('IRON'); await tap('7I');
    await setDistance(area('second-surface').parentElement, 150);
    await tap(area('second-lie-flat'));
  };
  const pinButton = (label) => find(label, area('pin-position'))[0];

  it('온그린 성공(파4) → 퍼팅 탭의 핀 위치가 화면 맨 위로 온다', async () => {
    await toGreen();
    const w = watchScroll();
    await tap(area('second-result-on'));
    expect(currentTab()).toBe('퍼팅');
    await w.lands('putt-pin');
  });

  it('핀 위치를 고르면 접히지 않은 채 온그린 랜딩 방향으로 간다. 같은 방향을 다시 눌러 지울 때는 움직이지 않는다', async () => {
    await toGreen();
    const w = watchScroll();
    await tap(area('second-result-on'));
    await w.lands('putt-pin');                                           // 들어올 때의 이동이 끝난 뒤에 누른다 (타이머가 겹쳐 우연히 맞는 일이 없게)
    w.reset();
    await tap(pinButton('센터'));
    await w.lands('putt-landing');
    expect(find(/./, area('pin-position')).length).toBe(9);              // 선택지 9개가 그대로 펼쳐져 있다
    w.reset();
    await tap(pinButton('센터'));                                          // 해제
    await new Promise((r) => setTimeout(r, 400));
    expect(w.names()).toEqual([]);
  });

  it('핀 위치를 이미 골랐으면 퍼팅 탭에 다시 들어올 때는 랜딩 방향으로, 랜딩까지 골랐으면 PUTT 카드로 간다', async () => {
    await toGreen();
    const w = watchScroll();
    await tap(area('second-result-on'));
    await w.lands('putt-pin');
    w.reset();
    await tap(pinButton('센터'));
    await w.lands('putt-landing');
    await tapTab('field');
    await new Promise((r) => setTimeout(r, 300));
    w.reset();
    await tapTab('putt');
    await w.lands('putt-landing');
    w.reset();
    await tap(document.querySelector('[data-role="landing-zone"][data-hour="3"]'));
    await w.lands('putt-top');
  });
});

describe('파3 — 핀 위치 · 티샷 결과 → 퍼팅', () => {
  it('핀 위치를 고르면 접히지 않은 채 거리 칸으로 가고, 티샷에서 그린 온이면 퍼팅 탭은 랜딩 방향부터 시작한다 (핀 위치는 티샷에서 이미 받았다)', async () => {
    await newHole();
    await setPar(0, 3);
    const w = watchScroll();
    await tap(find('센터', area('pin-position'))[0]);
    await w.lands('tee-distance');
    expect(find(/./, area('pin-position')).length).toBe(9);
    await tap('DRIVER');
    w.reset();
    await tap(find('그린 온')[0]);
    expect(currentTab()).toBe('퍼팅');
    expect(area('pin-position')).toBeNull();                              // 퍼팅 탭에는 핀 위치가 없다
    await w.lands('putt-landing');
  });
});
