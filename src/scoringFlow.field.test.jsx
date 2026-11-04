// @vitest-environment jsdom
// 스코어 상세 입력 — 필드샷 탭(세컨샷 · 써드샷 이후 · 벌타 · 칩인)의 버튼들을 사용자 순서대로 눌러 본다.
// 방식은 test/flowKit.jsx 머리말 참고.
import { describe, it, expect, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { one, find, tap, tapTab, area, currentTab, openPutts, scoreNow, stored, looksOn, on, text, newHole, setDistance, settle, installHooks } from './test/flowKit.jsx';

vi.setConfig({ testTimeout: 40000 });
installHooks();

// 티샷을 마치고 필드샷 탭을 연다 (드라이버 + 페어웨이 O)
const toField = async (prefs = null) => {
  await newHole(prefs);
  await tap('DRIVER');
  await tap('O');
  await tapTab('field');
};
const secondSection = () => area('second-surface').parentElement;
// 벌타 창에서 구제 방식 카드를 고른다 (글자를 주면 그 카드, 없으면 맨 위 카드)
const reliefCards = () => find(/번째 샷/).filter((b) => b.textContent.includes('다음 샷'));
const pickRelief = async (label = null) => {
  const card = label ? reliefCards().find((b) => b.textContent.includes(label)) : reliefCards()[0];
  expect(card, `구제 방식 "${label}" 카드`).toBeTruthy();
  await tap(card, '벌타 구제 방식 고르기');
};
const pickFirstRelief = () => pickRelief();

describe('필드샷 — 세컨샷 칸', () => {
  it('머리글을 누르면 세컨샷 칸이 접히고 다시 누르면 펼쳐진다', async () => {
    await toField();
    expect(area('second-surface')).toBeTruthy();
    await tap(find(/^세컨샷 \( 2nd \)/)[0]);
    expect(area('second-surface')).toBeNull();                          // 접힘: 지형·라이가 안 보인다
    expect(area('second-result')).toBeTruthy();                         // 하지만 결과 버튼은 남는다
    await tap(find(/^세컨샷 \( 2nd \)/)[0]);
    expect(area('second-surface')).toBeTruthy();
  });

  it('남은 거리: 값이 없으면 "탭하면 … 부터" 안내, 슬라이더를 움직이면 숫자가 보이고 저장된다', async () => {
    await toField();
    expect(text()).toContain('탭하면 150 m 부터');
    await setDistance(secondSection(), 135);
    expect(text()).not.toContain('탭하면 150 m 부터');
    expect(text()).toContain('135');
    expect((await stored()).s.remainingDistance).toBe(135);
  });

  it('클럽 4종: WOOD · HYBRID · IRON · WEDGE 를 차례로 누르면 하나만 눌리고 세부 줄이 바뀐다', async () => {
    await toField();
    for (const [club, subs] of [['WOOD', ['3W', '5W', '7W', '9W']], ['HYBRID', ['2H', '3H', '4H', '5H']], ['IRON', ['7I', '8I', '9I']], ['WEDGE', ['48°', '56°', '60°']]]) {
      await tap(club);
      subs.forEach((sub) => expect(find(sub).length, `${club} 의 ${sub}`).toBe(1));
    }
    await tap('56°');
    expect((await stored()).s).toMatchObject({ secondClub: 'wedge', secondClubSub: '56' });
    expect(looksOn(one('56°'))).toBe(true);
  });

  it('지형 세 가지는 하나만 눌리고, 같은 칩을 다시 누르면 해제된다', async () => {
    await newHole();
    await tap('DRIVER');                                                // 페어웨이를 누르지 않은 채 필드샷으로
    await tapTab('field');
    const ids = ['fairway', 'rough', 'bunker'];
    for (const id of ids) {
      await tap(area(`second-surface-${id}`));
      expect(on(`second-surface-${id}`)).toBe(true);
      ids.filter((x) => x !== id).forEach((x) => expect(on(`second-surface-${x}`), `${id} 선택 중 ${x}`).toBe(false));
    }
    await tap(area('second-surface-bunker'));
    ids.forEach((x) => expect(on(`second-surface-${x}`)).toBe(false));
  });

  it('라이: 평지 · 오르막 · 내리막은 한 번에, 기타를 열면 방향 선택이 나오고 고르면 접힌다', async () => {
    await toField();
    for (const [id, label] of [['flat', '평지'], ['uphill', '오르막'], ['downhill', '내리막']]) {
      await tap(area(`second-lie-${id}`));
      expect(on(`second-lie-${id}`), label).toBe(true);
    }
    await tap(area('second-lie-downhill'));                              // 눌려 있던 칩을 다시 눌러 해제
    expect(on('second-lie-downhill')).toBe(false);
    await tap(area('second-lie-more'));
    expect(text()).toContain('오르막 슬라이스');
    await tap(find('오르막 슬라이스')[0]);
    expect((await stored()).s.terrainCondition).toBe('uphill-slice');
    expect(on('second-lie-more')).toBe(true);                           // 기타에서 고른 라이는 "기타" 칩이 눌린 모양
    expect(text()).not.toContain('기타 ▴');                               // 고르면 접힌다
  });

  it('바람: 펼치면 나침반이 나오고, 방향을 탭하면 방향이 요약에 보이고, 방향 초기화로 지운다', async () => {
    await toField();
    await tap('IRON'); await tap('7I');                                  // 클럽을 골라야 바람이 활성화된다
    await tap(find(/바람/)[0]);
    expect(text()).toContain('탭해서 방향 설정');
    const compass = [...document.querySelectorAll('div')].find((d) => d.style.touchAction === 'pan-y' && d.style.width === '210px');
    compass.getBoundingClientRect = () => ({ left: 0, top: 0, width: 210, height: 210, right: 210, bottom: 210 });
    fireEvent.pointerDown(compass, { clientX: 160, clientY: 105, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerUp(compass, { clientX: 160, clientY: 105, pointerId: 1, pointerType: 'touch' });
    await settle();
    expect((await stored()).s.windDirection).toBe(90);                   // 오른쪽(동쪽) 탭 = 90°
    expect(text()).toMatch(/E 90°/);
    await tap('방향 초기화');
    expect((await stored()).s.windDirection ?? null).toBeNull();
    expect(text()).toContain('탭해서 방향 설정');
  });
});

describe('필드샷 — 온그린 결과 (파4 GIR)', () => {
  it('성공 → 퍼팅 탭, 실패 → 써드샷이 열리고 세컨샷 칸은 접힌다. 실패 줄은 붉게 남는다', async () => {
    await toField();
    await tap(area('second-result-miss'));
    expect(currentTab()).toBe('필드샷');
    expect(text()).toContain('써드샷');
    expect(looksOn(area('second-result-miss'))).toBe(true);
    expect(area('second-surface')).toBeNull();                           // 세컨샷 칸은 접혔다
    expect(text()).toContain('놓친 방향');                                 // 파4 GIR 실패 → 놓친 방향
    expect((await stored()).s.extraShots).toHaveLength(1);
  });

  it('실패를 눌러 써드샷이 생긴 뒤 "성공"으로 고치면 써드샷이 사라지고 퍼팅으로 간다', async () => {
    await toField();
    await tap(area('second-result-miss'));
    expect(text()).toContain('써드샷');
    await tap(area('second-result-on'));
    expect(currentTab()).toBe('퍼팅');
    expect((await stored()).s.extraShots).toHaveLength(0);
    await tapTab('field');
    expect(text()).not.toContain('써드샷');
    expect(looksOn(area('second-result-on'))).toBe(true);
  });

  it('놓친 방향 4가지는 하나만 눌리고 다시 누르면 해제된다 (선택 입력이라 안 눌러도 넘어간다)', async () => {
    await toField();
    await tap(area('second-result-miss'));
    for (const d of ['롱', '라이트', '숏', '레프트']) {
      await tap(d);
      expect(looksOn(one(d)), d).toBe(true);
      ['롱', '라이트', '숏', '레프트'].filter((x) => x !== d).forEach((x) => expect(looksOn(one(x)), `${d} 선택 중 ${x}`).toBe(false));
    }
    await tap('레프트');
    expect(looksOn(one('레프트'))).toBe(false);
  });

  it('칩인: 홀인 연출이 나오고 "취소 (잘못 눌렀어요)"를 누르면 원래 화면으로 돌아온다', async () => {
    await toField();
    await tap(find('칩인')[0]);
    expect(text()).toContain('홀인 성공');
    await tap('취소 (잘못 눌렀어요)');
    expect(text()).not.toContain('홀인 성공');
    expect(currentTab()).toBe('필드샷');
    expect((await stored()).s.onGreen).not.toBe('chip-in');
    expect((await stored(0)).s.confirmed).not.toBe(true);
  });
});

describe('필드샷 — 써드샷 이후', () => {
  const toThird = async () => { await toField(); await tap(area('second-result-miss')); };
  const third = () => area('extra-surface-0');

  it('써드샷 칸에도 남은 거리 · 클럽 · 지형 · 라이 · 바람 · 벌타 · 온그린 결과가 있다', async () => {
    await toThird();
    expect(third()).toBeTruthy();
    expect(area('extra-lie-0')).toBeTruthy();
    expect(text()).toContain('남은 거리');
    expect(text()).toMatch(/벌타/);
    expect(text()).toContain('✕ 써드샷 ( 3rd ) 이후 삭제');
  });

  it('써드샷에서도 지형 · 라이를 고르고, 거리와 클럽을 넣고, 성공을 누르면 퍼팅으로 간다', async () => {
    await toThird();
    await tap(area('extra-surface-0-rough'));
    expect(on('extra-surface-0-rough')).toBe(true);
    await tap(area('extra-lie-0-uphill'));
    expect(on('extra-lie-0-uphill')).toBe(true);
    await setDistance(third().parentElement, 40);
    await tap('WEDGE'); await tap('56°');
    const successes = find('성공');
    await tap(successes[successes.length - 1]);
    expect(currentTab()).toBe('퍼팅');
    expect(openPutts()).toEqual([1]);
    const s = (await stored()).s;
    expect(s.extraShots[0]).toMatchObject({ surface: 'rough', club: 'wedge', subClub: '56', remainingDistance: 40, onGreen: true });
  });

  it('써드샷도 실패 → 포쓰샷이 이어지고, "이후 삭제"를 누르면 그 샷부터 사라진다', async () => {
    await toThird();
    const fails = find('실패');
    await tap(fails[fails.length - 1]);                                  // 써드샷 실패
    expect(text()).toContain('포쓰샷');
    expect((await stored()).s.extraShots).toHaveLength(2);
    await tap(find(/이후 삭제$/).find((b) => b.textContent.includes('포쓰샷')));
    expect(text()).not.toContain('포쓰샷');
    expect((await stored()).s.extraShots).toHaveLength(1);
  });

  it('써드샷 머리글을 누르면 접히고, 세컨샷 머리글을 누르면 세컨샷이 펼쳐진다', async () => {
    await toThird();
    expect(third()).toBeTruthy();
    await tap(find(/^써드샷 \( 3rd \)/)[0]);
    expect(third()).toBeNull();
    await tap(find(/^세컨샷 \( 2nd \)/)[0]);
    expect(area('second-surface')).toBeTruthy();
  });

  it('써드샷 칩인도 홀인 연출이 나오고 취소하면 써드샷이 그대로 남는다', async () => {
    await toThird();
    const chips = find('칩인');
    await tap(chips[chips.length - 1]);
    expect(text()).toContain('홀인 성공');
    await tap('취소 (잘못 눌렀어요)');
    expect(text()).toContain('써드샷');
    expect((await stored()).s.extraShots).toHaveLength(1);
  });
});

describe('필드샷 — 샷별 벌타', () => {
  it('세컨샷에서 OB: 창이 뜨고 취소하면 아무것도 바뀌지 않고, 고르면 합계 OB 가 1 이 되어 스코어가 늘고 다음 샷이 열린다', async () => {
    await toField();
    const before = scoreNow().pending;
    await tap(find('OB')[0]);
    expect(text()).toContain('OB 처리를 어떻게 했나요?');
    await tap('취소');                                                    // 창을 닫으면 아무것도 바뀌지 않는다
    expect(text()).not.toContain('OB 처리를 어떻게 했나요?');
    expect((await stored()).s.ob).toBe(0);
    await tap(find('OB')[0]);
    await pickFirstRelief();
    expect(text()).not.toContain('OB 처리를 어떻게 했나요?');
    expect((await stored()).s.ob).toBe(1);
    expect(scoreNow().pending).toBeGreaterThan(before);                   // 벌타가 스코어에 들어간다
    expect(area('second-surface')).toBeNull();                             // 다음 샷이 열리면서 세컨샷 칸은 접힌다
  });

  it('세컨샷 OB 의 선택지: 스트로크와 거리(1벌타)는 다음 샷이 4번째, OB티(2벌타 상당)는 5번째', async () => {
    await toField();
    await tap(find('OB')[0]);
    const cards = reliefCards().map((b) => b.textContent.replace(/\s+/g, ' '));
    expect(cards).toHaveLength(2);
    expect(cards[0]).toContain('스트로크와 거리 구제');
    expect(cards[0]).toMatch(/다음 샷 ?4 ?번째 샷/);
    expect(cards[1]).toContain('OB티');
    expect(cards[1]).toMatch(/다음 샷 ?5 ?번째 샷/);
  });

  it('세컨샷 OB(1벌타 + 제자리에서 다시 치기): 3번째가 벌타, 다음 샷은 "4번째 샷 · 다시 친 샷", 온그린까지 4타, 남은 거리가 그대로 이어진다', async () => {
    await toField();
    await setDistance(secondSection(), 140);
    expect(scoreNow().pending).toBe(2);
    await tap(find('OB')[0]);
    await pickRelief('스트로크와 거리 구제');
    expect(scoreNow().pending).toBe(4);                                    // 티샷 · 세컨샷(OB) · 벌타 1 · 다시 친 샷
    expect(text()).toContain('4번째 샷 · 다시 친 샷');
    const s = (await stored()).s;
    expect(s.penalties[0]).toMatchObject({ slot: 1, type: 'ob', mode: 'replay' });
    expect(s.extraShots[0].remainingDistance).toBe(140);                   // 제자리에서 치니까 남은 거리는 같다
    expect(text()).toContain('140');
  });

  it('접힌 세컨샷 머리글에 OB 와 방식이 보여서, 펼치지 않아도 기록했는지 알 수 있다', async () => {
    await toField();
    await tap(find('OB')[0]);
    await pickRelief('스트로크와 거리 구제');
    expect(area('second-surface')).toBeNull();
    expect(area('second-penalty-tag').textContent).toBe('OB · 다시 치기');
    await tap(find(/^세컨샷 \( 2nd \)/)[0]);                                // 펼치면 머리글의 요약은 사라지고 벌타 칩이 보인다
    expect(area('second-penalty-tag')).toBeNull();
    const chip = find(/^OB · 다시 치기.*✕$/)[0];
    expect(chip).toBeTruthy();
    await tap(chip);                                                       // ✕ 로 취소하면 합계도 0
    expect((await stored()).s.ob).toBe(0);
  });

  it('해저드 · 언플레이어블도 같은 식으로 기록되고 윗칸 합계에 반영된다', async () => {
    await toField();
    await tap(find('해저드')[0]);
    await pickFirstRelief();
    expect((await stored()).s.hazard).toBe(1);
    await tap(find('언플레이어블')[0]);
    await pickFirstRelief();
    expect((await stored()).s.unplayable).toBe(1);
  });
});

describe('필드샷 — 벌타 이유 (거리 미스 · 방향 미스 · 생크)', () => {
  const askBtn = (id) => area(`penalty-ask-${id}`);

  it('OB 창 맨 위에 "어떤 미스였나요? (선택)" 버튼 3개가 있고, 고르지 않아도 구제 방식을 고를 수 있다', async () => {
    await toField();
    await tap(find('OB')[0]);
    expect(area('penalty-reason-ask').textContent).toContain('어떤 미스였나요?');
    expect(['distance', 'direction', 'shank'].map((id) => askBtn(id).textContent)).toEqual(['거리 미스', '방향 미스', '생크']);
    await pickFirstRelief();                                                // 이유 없이 기록
    expect((await stored()).s.penalties[0].reason).toBeUndefined();
  });

  it('이유를 하나 고르면 눌린 모양이고(하나만), 다시 누르면 해제되며, 구제 방식을 고르면 함께 기록된다', async () => {
    await toField();
    await tap(find('OB')[0]);
    await tap(askBtn('distance'));
    expect(looksOn(askBtn('distance'))).toBe(true);
    await tap(askBtn('direction'));
    expect(looksOn(askBtn('direction'))).toBe(true);
    expect(looksOn(askBtn('distance'))).toBe(false);
    await tap(askBtn('direction'));
    expect(looksOn(askBtn('direction'))).toBe(false);
    await tap(askBtn('shank'));
    await pickRelief('스트로크와 거리 구제');
    expect((await stored()).s.penalties[0]).toMatchObject({ type: 'ob', reason: 'shank' });
    expect(area('second-penalty-tag').textContent).toBe('OB · 다시 치기 · 생크');
  });

  it('기록한 뒤에도 벌타 칩 아래 "이유" 줄에서 바꾸거나 지울 수 있다', async () => {
    await toField();
    await tap(find('OB')[0]);
    await pickRelief('스트로크와 거리 구제');
    await tap(find(/^세컨샷 \( 2nd \)/)[0]);
    const row = area('penalty-reason-1');
    expect(row).toBeTruthy();
    await tap(area('penalty-reason-1-direction'));
    expect(looksOn(area('penalty-reason-1-direction'))).toBe(true);
    expect((await stored()).s.penalties[0].reason).toBe('direction');
    await tap(area('penalty-reason-1-distance'));
    expect((await stored()).s.penalties[0].reason).toBe('distance');
    await tap(area('penalty-reason-1-distance'));
    expect((await stored()).s.penalties[0].reason).toBeUndefined();
  });

  it('해저드도 이유를 묻고, 언플레이어블은 묻지 않는다', async () => {
    await toField();
    await tap(find('해저드')[0]);
    expect(area('penalty-reason-ask')).toBeTruthy();
    await tap('취소');
    await tap(find('언플레이어블')[0]);
    expect(area('penalty-reason-ask')).toBeNull();
    await pickFirstRelief();
    await tap(find(/^세컨샷 \( 2nd \)/)[0]);
    expect(area('penalty-reason-1')).toBeNull();
  });

  it('티샷 OB 에도 이유를 고를 수 있고 티샷 칩 아래에 "이유" 줄이 생긴다', async () => {
    await newHole();
    await tap('DRIVER');
    await tap(find('OB')[0]);
    await tap(askBtn('direction'));
    await pickRelief('스트로크와 거리 구제');
    await tapTab('tee');
    expect(looksOn(area('penalty-reason-0-direction'))).toBe(true);
  });

  it('OB 로 그린을 노린 샷이 벌타가 되면 "놓친 방향" 질문은 사라지고 벌타 이유가 대신한다', async () => {
    await toField();
    await tap(area('second-result-miss'));                                  // 보통의 실패: 놓친 방향을 물어본다
    expect(text()).toContain('놓친 방향');
    await tap('롱');
    expect((await stored()).s.greenMiss).toBe('long');
    await tapTab('field');
    await tap(find(/^세컨샷 \( 2nd \)/)[0]);
    await tap(find('OB')[0]);
    await pickRelief('스트로크와 거리 구제');
    expect(text()).not.toContain('놓친 방향');
    expect((await stored()).s.greenMiss ?? null).toBeNull();                // 먼저 눌러 둔 방향도 비운다
  });
});
