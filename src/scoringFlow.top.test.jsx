// @vitest-environment jsdom
// 스코어 상세 입력 — 윗칸(스코어 · 퍼팅 수 · 벌타 합계)과 샷 입력이 서로 같은 숫자를 보여 주는지 확인한다.
// 방식은 test/flowKit.jsx 머리말 참고.
import { describe, it, expect, vi } from 'vitest';
import { find, tap, tapTab, currentTab, tabInfo, scoreNow, puttsPicked, stored, text, newHole, installHooks, area } from './test/flowKit.jsx';

vi.setConfig({ testTimeout: 40000 });
installHooks();

// 윗칸 스코어 "−" / "+" (큰 동그라미 버튼)
const scoreMinus = () => area('score-minus');
const scorePlus = () => area('score-plus');
// 윗칸 퍼팅 수 버튼 (0~4)
const puttsBtn = (n) => area(`putts-${n}`);
// 벌타 — "벌타 ›" 줄을 눌러 열면 해저드 · OB · 언플레이어블 칸이 나온다. 칸마다 − / + 두 버튼
const openPenalty = async () => { if (!area('penalty-panel')) await tap(area('penalty-toggle'), '벌타 열기'); };
const penaltyBox = (label) => area(`penalty-${label}`);
const penMinus = (label) => penaltyBox(label).querySelectorAll('button')[0];
const penPlus = (label) => penaltyBox(label).querySelectorAll('button')[1];

describe('윗칸 스코어 — 샷을 입력하기 전', () => {
  it('+ 를 누르면 스코어가 오르고 퍼팅 수가 추정되며, 초기화를 누르면 파로 돌아간다', async () => {
    await newHole();
    expect(scoreNow().n).toBe(4);
    await tap(scorePlus());
    expect(scoreNow().n).toBe(5);
    expect(text()).toContain('보기');                                   // 큰 숫자 아래의 스코어 이름 (파 대비 +1)
    await tap(scorePlus()); await tap(scorePlus());
    expect(scoreNow().n).toBe(7);
    await tap(scoreMinus());
    expect(scoreNow().n).toBe(6);
    await tap(find('초기화')[0]);                                         // 스코어 줄의 초기화 (이 줄이 맨 위)
    expect(scoreNow().n).toBe(4);
  });

  it('스코어는 1 아래로 내려가지 않고 20 을 넘지 않는다', async () => {
    await newHole();
    for (let i = 0; i < 6; i++) await tap(scoreMinus());
    expect(scoreNow().n).toBe(1);
    for (let i = 0; i < 25; i++) await tap(scorePlus());
    expect(scoreNow().n).toBe(20);
  });
});

describe('윗칸 스코어 — 샷을 입력하는 중 (자동 계산 ↔ 직접 입력)', () => {
  it('클럽을 고르면 "온그린까지 N타 · 퍼팅 남음", 퍼팅을 입력하면 숫자로 바뀐다', async () => {
    await newHole();
    await tap('DRIVER');
    expect(scoreNow()).toEqual({ pending: 2, n: null });
    expect(text()).toContain('샷 기록으로 자동 계산');
    expect(text()).toContain('진행 중');
    await tap(puttsBtn(2));
    expect(scoreNow()).toEqual({ pending: null, n: 4 });               // 2 + 2퍼트
    expect(puttsPicked()).toBe('2');
  });

  it('+ 를 누르면 "직접 입력"으로 바뀌고 "자동 계산" 버튼이 생기며, 그 버튼을 누르면 샷 기록 계산으로 돌아간다', async () => {
    await newHole();
    await tap('DRIVER'); await tap(puttsBtn(2));
    await tap(scorePlus());
    expect(scoreNow().n).toBe(5);
    expect(text()).toContain('직접 입력 · 벌타 포함 총 스코어');
    await tap(puttsBtn(3));                                             // 직접 입력 중에 퍼팅 수를 바꿔도 스코어는 그대로
    expect(scoreNow().n).toBe(5);
    await tap('자동 계산');
    expect(text()).toContain('샷 기록으로 자동 계산');
    expect(scoreNow().n).toBe(5);                                       // 티샷+세컨샷+퍼트 3 = 5
  });
});

describe('윗칸 퍼팅 수', () => {
  it('0~4 를 누르면 하나만 눌린 모양이고, 4 이상은 "4+" 로 보이며 4+ 를 다시 누르면 5~8 선택이 열린다', async () => {
    await newHole();
    await tap('DRIVER');
    for (const n of [0, 1, 2, 3]) {
      await tap(puttsBtn(n));
      expect(puttsPicked()).toBe(String(n));
    }
    await tap(puttsBtn(4));
    expect(puttsPicked()).toBe('4+');
    await tap(puttsBtn(4));                                             // 4+ 를 다시 누르면 더 큰 숫자 선택
    for (const n of [5, 6, 7, 8]) expect(find(String(n)).length, `${n} 선택지`).toBeGreaterThan(0);
    await tap(find('6').find((b) => b.getAttribute('aria-pressed') != null));
    expect(puttsPicked()).toBe('6+');
    expect((await stored()).s.putts).toBe(6);
  });

  it('초기화는 퍼팅 수를 2 로 되돌린다', async () => {
    await newHole();
    await tap('DRIVER'); await tap(puttsBtn(4));
    await tap(find('초기화')[0]);                                         // 샷을 입력 중인 홀은 스코어 줄에 초기화가 없고 퍼팅 줄의 것뿐
    expect(puttsPicked()).toBe('2');
  });

  it('스코어를 퍼팅 수 이하로 내리면 퍼팅 수가 따라 줄고, 스코어를 다시 올리면 원래 퍼팅 수로 돌아온다', async () => {
    await newHole();
    await tap('DRIVER'); await tap(puttsBtn(3));                       // 2 + 3 = 5타
    await tap(scoreMinus()); await tap(scoreMinus()); await tap(scoreMinus());   // 5 → 2
    expect(scoreNow().n).toBe(2);
    expect(Number(puttsPicked())).toBeLessThan(3);                       // 퍼팅이 스코어보다 많을 수 없다
    await tap(scorePlus()); await tap(scorePlus()); await tap(scorePlus());
    expect(puttsPicked()).toBe('3');                                    // 잘렸던 퍼팅 기록이 돌아온다
  });
});

describe('윗칸 벌타 합계', () => {
  it('OB + 를 누르면 숫자가 오르고 스코어가 +2, 초기화 버튼이 생긴다. − 로 되돌리면 사라진다', async () => {
    await newHole();
    await tap('DRIVER'); await tap(puttsBtn(2));
    expect(scoreNow().n).toBe(4);
    expect(find('초기화').length).toBe(1);                              // 퍼팅 줄의 것뿐
    await openPenalty();
    await tap(penPlus('OB'));
    expect(scoreNow().n).toBe(6);                                       // OB 1회 = +2타
    expect(find('초기화').length).toBe(2);                              // 벌타 줄에도 초기화가 생겼다
    expect(text()).toContain('여기서 넣은 OB는 OB티 기준(+2타)');
    await tap(penMinus('OB'));
    expect(scoreNow().n).toBe(4);
    expect(find('초기화').length).toBe(1);
  });

  it('해저드 · 언플레이어블은 +1타씩, 최대 5회까지, 초기화로 모두 지운다', async () => {
    await newHole();
    await tap('DRIVER'); await tap(puttsBtn(2));
    await openPenalty();
    await tap(penPlus('해저드'));
    expect(scoreNow().n).toBe(5);
    await tap(penPlus('언플레이어블'));
    expect(scoreNow().n).toBe(6);
    for (let i = 0; i < 8; i++) await tap(penPlus('해저드'));
    expect((await stored()).s.hazard).toBe(5);                           // 5회에서 멈춘다
    await tap(find('초기화')[1]);                                         // 벌타 줄의 초기화
    expect(scoreNow().n).toBe(4);
    expect((await stored()).s).toMatchObject({ ob: 0, hazard: 0, unplayable: 0 });
  });

  it('위쪽에서 OB 를 넣은 뒤 티샷의 OB 칩을 누르면 두 번 세지 않는다', async () => {
    await newHole();
    await tap('DRIVER'); await tap(puttsBtn(2));
    await openPenalty();
    await tap(penPlus('OB'));
    await tap(find('OB').filter((b) => !penaltyBox('OB').contains(b))[0]);                                           // 티샷 줄 OB
    await tap(find(/번째 샷/).find((b) => b.textContent.includes('다음 샷')));
    expect((await stored()).s.ob).toBe(1);
  });

  it('티샷에서 OB 를 기록하면 윗칸 OB 가 1 이 되고, 칩의 ✕ 로 지우면 0 으로 돌아간다', async () => {
    await newHole();
    await tap('DRIVER'); await tap(puttsBtn(2));
    await tap(find('OB')[0]);
    await tap(find(/번째 샷/).find((b) => b.textContent.includes('다음 샷')));
    await openPenalty();
    expect(penaltyBox('OB').textContent).toContain('1');
    if (currentTab() !== '티샷') await tapTab('tee');
    await tap(find(/^OB.*✕$/)[0]);
    expect(penaltyBox('OB').textContent).toContain('0');
    expect(scoreNow().n).toBe(4);
  });
});

describe('티샷 마무리 시 자동으로 다음 탭', () => {
  it('구질 · 페어웨이 · 랜딩까지 모두 입력하면 필드샷 탭으로 넘어간다 (하나라도 비면 티샷 탭에 남는다)', async () => {
    await newHole();
    await tap('DRIVER'); await tap('스트레이트'); await tap('O');
    expect(currentTab()).toBe('티샷');
    await tap(/^C ?센터$/);
    expect(currentTab()).toBe('필드샷');
  });

  it('1온을 해제하거나 클럽을 해제하면 티샷 탭으로 돌아온다', async () => {
    await newHole();
    await tap('DRIVER');
    await tapTab('field');
    await tapTab('tee');
    await tap('DRIVER');                                                // 클럽 해제
    expect(currentTab()).toBe('티샷');
    expect(tabInfo()['필드샷'].disabled).toBe(true);
  });
});
