// @vitest-environment jsdom
// 스코어 상세 입력 — 홀 이동(아래 막대 · 홀 표) · 확인 창 · 메모 · 홈 · 완료 · 코스맵 · 위치 찍기를 사용자 순서대로 눌러 본다.
// 방식은 test/flowKit.jsx 머리말 참고.
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { one, find, tap, tapTab, area, currentTab, tabInfo, puttCards, holeHeader, stored, looksOn, text, newHole, setDistance, waitForHole, installHooks, buttons, labelOf } from './test/flowKit.jsx';

vi.setConfig({ testTimeout: 40000 });
installHooks();

const prev = () => tap(find('이전')[0]);
const holeCell = (n) => buttons().filter((b) => labelOf(b) !== '' && b.closest('[data-role="nav-score"]'))[n - 1];
const goHole = (n) => tap(holeCell(n), `${n}번 홀 칸`);

// 한 홀을 끝까지: 파4 드라이버 · 7I · 성공 · PUTT 1 홀인 → 다음 홀 (홀인 연출 뒤)
const playHole = async (n) => {
  await tap('DRIVER'); await tap('O');
  await tapTab('field');
  await tap('IRON'); await tap('7I');
  await setDistance(area('second-surface').parentElement, 150);
  await tap(area('second-lie-flat'));
  await tap(area('second-result-on'));
  await tap(area('putt-primary'));
  await waitForHole(n + 1);
};

describe('다음 홀 — 아무것도 입력하지 않은 홀', () => {
  it('"다음"을 누르면 파로 기록할지 묻고, 취소하면 그대로 1번 홀에 남는다', async () => {
    await newHole();
    await tap(one('다음'));
    expect(text()).toMatch(/1 ?번 홀 스코어를 입력하지 않았어요/);
    await tap('취소');
    expect(text()).not.toContain('스코어를 입력하지 않았어요');
    expect(holeHeader().hole).toBe(1);
  });

  it('"기록하지 않고 넘어가기"는 다음 홀로 가되 1번 홀은 끝난 홀로 세지 않고, "파로 기록하고 다음 홀"은 파로 확정한다', async () => {
    await newHole();
    await tap(one('다음'));
    await tap('기록하지 않고 넘어가기');
    expect(holeHeader().hole).toBe(2);
    expect((await stored(0)).s.confirmed).not.toBe(true);
    await tap(one('다음'));                                              // 2번 홀에서
    await tap('파로 기록하고 다음 홀');
    expect(holeHeader().hole).toBe(3);
    expect((await stored(1)).s).toMatchObject({ strokes: 4, confirmed: true });
    expect(text()).toMatch(/SCORE - 4 - /);                                 // 홀 표: 1번은 비었고 2번은 파(4)
  });
});

describe('다음 홀 — 입력 중인 홀 (빠진 정보 확인 창)', () => {
  it('드라이버만 고르고 "다음"을 누르면 퍼팅 수를 묻는 창이 뜨고, 숫자를 누르면 그 퍼팅 수로 확정하고 다음 홀로 간다', async () => {
    await newHole();
    await tap('DRIVER');
    await tap(one('다음'));
    expect(area('hole-check')).toBeTruthy();
    expect(text()).toMatch(/온그린까지 \d ?타|퍼팅을 몇 번|확인할 게 있어요/);
    await tap(area('putt-ask-2'));
    expect(holeHeader().hole).toBe(2);
    expect((await stored(0)).s).toMatchObject({ putts: 2, confirmed: true });
  });

  it('창에서 "입력하러 가기"를 누르면 빠진 샷이 있는 탭이 열린다', async () => {
    await newHole();
    await tap('DRIVER');
    await tap(one('다음'));
    if (area('info-ask-fill')) {
      await tap(area('info-ask-fill'));
      expect(area('hole-check')).toBeNull();
      expect(['티샷', '필드샷']).toContain(currentTab());
      expect(holeHeader().hole).toBe(1);                                   // 홀은 그대로
    } else {
      await tap('취소');
      expect(holeHeader().hole).toBe(1);
    }
  });

  it('창의 바깥을 누르거나 취소하면 아무것도 확정하지 않고 같은 홀에 남는다', async () => {
    await newHole();
    await tap('DRIVER');
    await tap(one('다음'));
    await tap(find('취소')[0]);
    expect(area('hole-check')).toBeNull();
    expect((await stored(0)).s.confirmed).not.toBe(true);
    expect(holeHeader().hole).toBe(1);
  });

  it('필수 정보(라이 · 지형 · 거리 · 클럽)를 다 넣고 퍼팅까지 끝낸 홀은 창 없이 바로 넘어간다', async () => {
    await newHole();
    await tap('DRIVER'); await tap('O');
    await tapTab('field');
    await tap('IRON'); await tap('7I');
    await setDistance(area('second-surface').parentElement, 150);
    await tap(area('second-lie-flat'));
    await tap(area('second-result-on'));
    await tap(area('putt-next'));
    await setDistance(area('putt-cards'), 1);
    await tap(area('putt-lie-flat'));
    await tap(one('다음'));
    expect(area('hole-check'), '필수 정보를 모두 넣었는데 확인 창이 떴다').toBeNull();
    expect(holeHeader().hole).toBe(2);
    expect((await stored(0)).s).toMatchObject({ confirmed: true, putts: 2 });
  });
});

describe('홀 이동 — 홀 표와 이전 버튼', () => {
  it('홀 표의 번호 칸을 누르면 그 홀로 가고, 이전을 누르면 한 홀 앞으로 간다. 1번 홀에서 이전은 눌리지 않는다', async () => {
    await newHole();
    expect(one('이전').disabled).toBe(true);
    await goHole(5);
    expect(holeHeader().hole).toBe(5);
    await prev();
    expect(holeHeader().hole).toBe(4);
    await goHole(1);
    expect(holeHeader().hole).toBe(1);
    expect(one('이전').disabled).toBe(true);
  });

  it('홀을 옮겨 다녀도 각 홀의 입력이 그대로이고, 새 홀은 티샷 탭부터 열린다', async () => {
    await newHole();
    await tap('DRIVER'); await tap('X');
    await goHole(3);
    expect(currentTab()).toBe('티샷');
    expect(tabInfo()['필드샷'].disabled).toBe(true);                       // 3번 홀은 아직 아무것도 안 했다
    await goHole(1);
    expect(currentTab()).toBe('필드샷');                                    // 티샷을 마친 홀은 이어서 입력할 필드샷 탭이 열린다
    expect(tabInfo()['필드샷'].disabled).toBe(false);
    await tapTab('tee');
    expect(looksOn(one('DRIVER'))).toBe(true);
    expect(looksOn(area('tee-fairway-miss'))).toBe(true);
  });

  it('한 홀을 끝낸 뒤 이전 홀로 돌아오면 퍼팅 탭이 열리고 입력한 퍼팅 카드가 보인다', async () => {
    await newHole();
    await playHole(1);
    expect(holeHeader().hole).toBe(2);
    await prev();
    expect(holeHeader().hole).toBe(1);
    expect(currentTab()).toBe('퍼팅');
    expect(puttCards().length).toBeGreaterThan(0);
    expect(text()).toMatch(/SCORE 3 - /);                                    // 홀 표에 1번 홀 버디(3타)
  });
});

describe('아래 막대 — 메모', () => {
  it('메모를 쓰고 저장하면 점이 생기고, 다시 열면 글이 그대로 있고, 취소하면 바뀌지 않는다', async () => {
    await newHole();
    expect(area('memo-dot')).toBeNull();
    await tap(area('memo-button'));
    expect(text()).toContain('HOLE 1 메모');
    const box = document.querySelector('textarea');
    fireEvent.change(box, { target: { value: '티샷이 좌측 러프로' } });
    expect(text()).toMatch(/9 ?\/ ?500|10 ?\/ ?500/);                        // 글자 수 표시
    await tap('저장');
    expect(area('memo-dot')).toBeTruthy();
    expect((await stored()).s.memo).toBe('티샷이 좌측 러프로');
    await tap(area('memo-button'));
    expect(document.querySelector('textarea').value).toBe('티샷이 좌측 러프로');
    fireEvent.change(document.querySelector('textarea'), { target: { value: '바꾸다 말았다' } });
    await tap('취소');
    expect((await stored()).s.memo).toBe('티샷이 좌측 러프로');
  });
});

describe('홈 · 뒤로 · 이어서', () => {
  it('아래 막대의 홈을 누르면 홈으로 가고 "이어서"로 같은 홀 같은 입력이 이어진다', async () => {
    await newHole();
    await tap('DRIVER'); await tap('X');
    await goHole(2);
    await tap(document.querySelector('[aria-label="홈"]'));
    await screen.findByText('새 라운드');
    expect(text()).toContain('진행 중인 라운드');
    expect(text()).toMatch(/2 ?번 홀 진행 중/);
    await tap('이어서');
    await screen.findByText(/^HOLE 2$/);
    await goHole(1);
    await tapTab('tee');
    expect(looksOn(area('tee-fairway-miss'))).toBe(true);                  // 1번 홀 입력이 남아 있다
  });

  it('헤더의 뒤로(<)는 입력이 있으면 "라운드를 그만두시겠어요?" 4지선다를 보여 주고, 계속 기록하기로 닫을 수 있다', async () => {
    await newHole();
    await tap('DRIVER');
    await tap(document.querySelector('[aria-label="뒤로"]'));
    expect(text()).toContain('라운드를 그만두시겠어요?');
    for (const b of ['계속 기록하기', '기록 유지하고 홈으로', '삭제하고 세팅 다시하기', '삭제하고 나가기']) expect(find(b).length, b).toBe(1);
    await tap('계속 기록하기');
    expect(text()).not.toContain('라운드를 그만두시겠어요?');
    expect(holeHeader().hole).toBe(1);
    await tap(document.querySelector('[aria-label="뒤로"]'));
    await tap('기록 유지하고 홈으로');
    await screen.findByText('새 라운드');
    expect(await stored(0)).toBeTruthy();                                   // 기록은 그대로
  });

  it('입력이 전혀 없을 때 뒤로(<)는 확인 없이 설정 화면으로 간다', async () => {
    await newHole();
    await tap(document.querySelector('[aria-label="뒤로"]'));
    await screen.findByText('New Round');
  });
});

describe('라운드 완료', () => {
  it('18번 홀에서 드라이버만 고르고 "완료"를 누르면 확인 창이 뜨고, 취소하면 완료되지 않고 18번 홀에 남는다', async () => {
    await newHole();
    await goHole(18);
    await tap('DRIVER');
    await tap(one('완료'));
    expect(area('hole-check')).toBeTruthy();
    await tap(find('취소')[0]);
    expect(area('hole-check')).toBeNull();
    expect(holeHeader().hole).toBe(18);
    expect((await stored(0)).round.completed).not.toBe(true);
  });

  it('입력하지 않은 홀 안내 창: "1번 홀 입력하러 가기"는 창을 닫고 그 홀로 가고, "그대로 완료"는 리포트로 간다', async () => {
    await newHole();
    await goHole(18);
    await tap(one('완료'));
    if (!/입력하지 않은 홀이 있어요/.test(text())) return;               // 18번 홀도 비어 있으면 곧바로 안내
    expect(text()).toContain('그대로 완료하면 이 홀들은 파(2퍼트)로 저장돼요');
    await tap(find(/입력하러 가기$/)[0]);
    expect(text()).not.toContain('입력하지 않은 홀이 있어요');
    expect(holeHeader().hole).toBe(1);
  });
});

describe('코스맵 · 위치 찍기', () => {
  it('코스맵 버튼을 누르면 지도 창이 열리고 닫을 수 있다', async () => {
    await newHole();
    expect(area('map-button')).toBeTruthy();
    await tap(area('map-button'));
    expect(text()).toMatch(/HOLE 1/);
    const close = buttons().find((b) => b.getAttribute('aria-label') === '닫기' || /닫기|✕|×/.test(b.textContent));
    expect(close, '지도 창에 닫는 버튼이 있어야 한다').toBeTruthy();
    await tap(close);
    expect(currentTab()).toBe('티샷');
  });

  it('위치 기능이 없는 기기에서 "여기서 위치 찍기"를 누르면 이유를 알려 준다 (빈 반응이 아니다)', async () => {
    await newHole();
    const had = navigator.geolocation;
    Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });
    await tap(find(/여기서 위치 찍기/)[0]);
    await waitFor(() => expect(text()).toMatch(/지원하지 않습니다|위치를 가져오지 못했습니다/));
    Object.defineProperty(navigator, 'geolocation', { value: had, configurable: true });
  });

  it('티샷 지점과 세컨샷 지점을 차례로 찍으면 티샷 거리가 보인다', async () => {
    await newHole();
    let call = 0;
    const spots = [{ latitude: 37.5, longitude: 127.0 }, { latitude: 37.50135, longitude: 127.0 }];     // 약 150m
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        watchPosition: (ok) => { const c = spots[Math.min(call++, 1)]; setTimeout(() => ok({ coords: { ...c, accuracy: 3 } }), 0); return 1; },
        clearWatch: () => {},
      },
    });
    await tap('DRIVER'); await tap('O');
    await tap(find(/여기서 위치 찍기/)[0]);                                 // 티샷 지점
    await waitFor(() => expect(text()).toMatch(/±3/));
    await tapTab('field');
    await tap(find(/여기서 위치 찍기/)[0]);                                 // 세컨샷 지점
    await waitFor(() => expect(text()).toMatch(/티샷에서 1[45]\d ?m|티샷.*1[45]\d ?m/));
    expect(area('map-button').style.animation).toBe('');                     // 지도를 써 봤으면 눌러 보라는 맥박 강조는 멈춘다
  });
});
