// @vitest-environment jsdom
// 스코어 상세 입력 — 티샷 탭의 버튼들을 사용자 순서대로 눌러 본다. 방식은 test/flowKit.jsx 머리말 참고.
import { describe, it, expect, vi } from 'vitest';
import { one, find, tap, tapTab, area, currentTab, tabInfo, puttCards, openPutts, scoreNow, stored, looksOn, on, text, newHole, setPar, installHooks } from './test/flowKit.jsx';
import { setVWorldKey } from './engine/mapTiles.js';

vi.setConfig({ testTimeout: 40000 });
installHooks();

describe('티샷 — 클럽', () => {
  it('클럽을 누르면 구질·페어웨이·랜딩이 나타나고, 같은 클럽을 다시 누르면 모두 사라지고 필드샷·퍼팅은 다시 잠긴다', async () => {
    await newHole();
    expect(text()).toContain('클럽을 선택하면 구질 입력이 나타나요');
    expect(text()).not.toContain('페어웨이 적중');
    await tap('DRIVER');
    expect(looksOn(one('DRIVER'))).toBe(true);
    expect(text()).toContain('페어웨이 적중');
    expect(text()).toContain('랜딩 위치');
    expect(text()).not.toContain('클럽을 선택하면 구질 입력이 나타나요');
    expect(tabInfo()['필드샷'].disabled).toBe(false);
    await tap('DRIVER');                                              // 다시 눌러 해제
    expect(looksOn(one('DRIVER'))).toBe(false);
    expect(text()).not.toContain('페어웨이 적중');
    expect(text()).toContain('클럽을 선택하면 구질 입력이 나타나요');
    expect(tabInfo()['필드샷'].disabled).toBe(true);
    expect(tabInfo()['퍼팅'].disabled).toBe(true);
    expect(scoreNow().pending).toBeNull();                             // 샷 기록이 없으니 '온그린까지 N타'도 사라진다
  });

  it('티샷 클럽 버튼은 DRIVER WOOD / HYBRID IRON 네 개를 두 줄 두 칸(2×2)으로 놓는다 (웨지 버튼은 없다)', async () => {
    await newHole();
    const grid = area('club-grid');
    expect(grid.style.display).toBe('grid');
    expect(grid.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
    expect([...grid.querySelectorAll(':scope > button')].map((b) => b.textContent.trim())).toEqual(['DRIVER', 'WOOD', 'HYBRID', 'IRON']);
    expect(find('WEDGE')).toHaveLength(0);
  });

  it('티샷 WOOD 는 3W · 5W · 7W · 9W 중에서 고르고, 고른 번호가 버튼에 보인다', async () => {
    await newHole();
    await tap('WOOD');
    for (const sub of ['3W', '5W', '7W', '9W']) expect(find(sub).length, `WOOD 세부 ${sub}`).toBe(1);
    await tap('3W');
    expect(looksOn(one('3W'))).toBe(true);
    expect(find('5W')).toHaveLength(0);                                // 고르면 세부 줄은 접힌다
    expect((await stored()).s).toMatchObject({ teeClub: 'wood', teeClubSub: '3W' });
    expect(tabInfo()['필드샷'].disabled).toBe(false);                    // 클럽을 골랐으니 다음 탭이 열린다
  });

  it('파3 도 티샷 클럽 버튼은 DRIVER · WOOD · HYBRID · IRON 이다', async () => {
    await newHole();
    await setPar(0, 3);
    for (const c of ['DRIVER', 'WOOD', 'HYBRID', 'IRON']) expect(find(c), c).toHaveLength(1);
    expect(find('WEDGE')).toHaveLength(0);
    await tap('DRIVER');
    expect((await stored()).s).toMatchObject({ teeClub: 'driver' });
  });

  it('HYBRID · IRON 은 세부 클럽을 고르고, 눌린 세부 클럽 이름이 버튼에 보인다', async () => {
    await newHole();
    await tap('HYBRID');
    for (const sub of ['2H', '3H', '4H', '5H']) expect(find(sub).length, `HYBRID 세부 ${sub}`).toBe(1);
    await tap('4H');
    expect(find('4H').length).toBe(1);                                // 고르면 세부 줄은 접히고 큰 버튼에 4H 가 쓰인다
    expect(looksOn(one('4H'))).toBe(true);
    expect(find('3H').length).toBe(0);
    expect((await stored()).s).toMatchObject({ teeClub: 'hybrid', teeClubSub: '4H' });
    await tap('DRIVER');                                              // 다른 종류로 바꾸면 세부는 비워진다
    expect((await stored()).s).toMatchObject({ teeClub: 'driver', teeClubSub: null });
    await tap('HYBRID');
    expect((await stored()).s).toMatchObject({ teeClub: 'hybrid', teeClubSub: null });
    for (const sub of ['2H', '3H', '4H', '5H']) expect(find(sub).length, `HYBRID 세부 ${sub}`).toBe(1);
    await tap('IRON');
    for (const sub of ['2I', '3I', '4I', '5I', '6I', '7I', '8I', '9I']) expect(find(sub).length, `IRON 세부 ${sub}`).toBe(1);
    await tap('9I');
    expect((await stored()).s).toMatchObject({ teeClub: 'iron', teeClubSub: '9I' });
    // 세부를 바꾸려면 큰 버튼(지금은 9I 라고 적혀 있다)을 다시 눌러 세부 목록을 펼치고, 거기서 고른다
    await tap(find('9I')[0]);
    expect(find('9I')).toHaveLength(2);                               // 큰 버튼 + 펼쳐진 세부 줄의 9I
    await tap(find('9I')[1]);                                         // 선택된 세부를 다시 누르면 세부만 해제
    expect((await stored()).s).toMatchObject({ teeClub: 'iron', teeClubSub: null });
    expect(looksOn(one('IRON'))).toBe(true);
  });

  it('파3 에서 클럽을 고르기 전에 코스맵의 "＋ 샷"을 눌러도 잠긴 필드샷 탭이 열리지 않고 티샷 탭에 머문다', async () => {
    // 지도 인증키가 없으면 코스맵은 "인증키 입력" 화면만 보여 줘 ＋ 샷 버튼이 없다. 이 PC 는 .env 에 키가 있어 통과했지만
    // 배포 서버(GitHub Actions)의 테스트 단계에는 키가 없어 실패했다 — 테스트용 가짜 키를 넣고 끝나면 지운다.
    setVWorldKey('test-key');
    try {
      await newHole();
      await setPar(0, 3);
      expect(tabInfo()['필드샷'].disabled).toBe(true);
      await tap(area('map-button'));
      await tap('＋ 샷');
      expect((await stored()).s).toMatchObject({ teeOnGreen: false });   // 샷은 늘어난다 (티샷 그린 온 표시가 풀림)
      expect(tabInfo()['필드샷'].disabled).toBe(true);                    // 클럽이 없으니 여전히 잠김
      expect(currentTab()).toBe('티샷');                                  // 잠긴 탭의 내용을 보여 주지 않는다
    } finally {
      setVWorldKey('');
    }
  });
});

describe('티샷 — 구질', () => {
  it('구질 7개를 눌러 보면 하나만 눌린 모양이고, 다시 누르면 해제된다', async () => {
    await newHole();
    await tap('DRIVER');
    const shapes = ['페이드', '스트레이트', '드로우', '훅', '풀', '푸시', '슬라이스'];
    for (const sh of shapes) {
      await tap(sh);
      expect(looksOn(one(sh)), `${sh} 선택`).toBe(true);
      shapes.filter((x) => x !== sh).forEach((x) => expect(looksOn(one(x)), `${sh} 선택 중 ${x}`).toBe(false));
      expect((await stored()).s.shotShape).toBe(sh);
    }
    await tap('슬라이스');
    expect(looksOn(one('슬라이스'))).toBe(false);
    expect((await stored()).s.shotShape ?? null).toBeNull();
    expect(currentTab()).toBe('티샷');                                // 구질을 눌러도 탭은 그대로
  });
});

describe('티샷 — 페어웨이 O/X · 랜딩 L/C/R 와 세컨샷 지형', () => {
  const surface = (id) => on(`second-surface-${id}`);

  it('X 를 누르면 세컨샷 지형이 러프로 미리 선택돼 있다', async () => {
    await newHole();
    await tap('DRIVER');
    await tap('X');
    expect(looksOn(area('tee-fairway-miss'))).toBe(true);
    expect(looksOn(area('tee-fairway-hit'))).toBe(false);
    await tapTab('field');
    expect(surface('rough')).toBe(true);
    expect(surface('fairway')).toBe(false);
    expect(text()).toContain('티샷 페어웨이를 놓쳐 자동 선택');
  });

  it('O 로 갔다가 세컨샷에서 러프로 바꾸면 티샷 페어웨이가 X 로 바뀌고, 그렇게 바뀌었다고 알려 준다', async () => {
    await newHole();
    await tap('DRIVER'); await tap('O');
    await tapTab('field');
    expect(surface('fairway')).toBe(true);
    await tap(area('second-surface-rough'));
    expect(surface('rough')).toBe(true);
    expect(surface('fairway')).toBe(false);
    await tapTab('tee');
    expect(looksOn(area('tee-fairway-miss'))).toBe(true);             // X 로 자동 변경
    expect(looksOn(area('tee-fairway-hit'))).toBe(false);
    expect(text()).toContain('세컨샷 지형이 페어웨이가 아니라 X 로 자동 선택');
  });

  it('X 로 갔다가 세컨샷에서 페어웨이로 바꾸면 티샷이 O 가 되고, 티샷에서 O/X 를 다시 누르면 직접 고른 값이 된다', async () => {
    await newHole();
    await tap('DRIVER'); await tap('X');
    await tapTab('field');
    await tap(area('second-surface-fairway'));
    await tapTab('tee');
    expect(looksOn(area('tee-fairway-hit'))).toBe(true);
    expect(text()).toContain('세컨샷 지형이 페어웨이라 O 로 자동 선택');
    await tap('X');
    expect(looksOn(area('tee-fairway-miss'))).toBe(true);
    expect(text()).not.toContain('로 자동 선택 · 다르면');
    await tapTab('field');
    expect(surface('fairway')).toBe(true);                            // 직접 고른 지형은 O/X 에 덮이지 않는다
  });

  it('러프로 자동 선택된 지형을 벙커로 바꿔도 티샷은 X 그대로다', async () => {
    await newHole();
    await tap('DRIVER'); await tap('X');
    await tapTab('field');
    await tap(area('second-surface-bunker'));
    expect(surface('bunker')).toBe(true);
    await tapTab('tee');
    expect(looksOn(area('tee-fairway-miss'))).toBe(true);
  });

  it('자동 선택된 지형 칩을 다시 눌러 해제하면 자동 선택 문구가 사라지고 추천 문구가 돌아온다', async () => {
    await newHole();
    await tap('DRIVER'); await tap('X');
    await tapTab('field');
    await tap(area('second-surface-rough'));
    expect(surface('rough')).toBe(false);
    expect(text()).not.toContain('티샷 페어웨이를 놓쳐 자동 선택');
    expect(text()).toContain('티샷 결과로는 러프');
  });

  it('랜딩 C 는 페어웨이를 O 로 채우고(자동 문구), L · R 은 채우지 않는다', async () => {
    await newHole();
    await tap('DRIVER');
    await tap(/^L ?레프트$/);
    expect(looksOn(area('tee-fairway-hit')) || looksOn(area('tee-fairway-miss'))).toBe(false);
    await tap(/^C ?센터$/);
    expect(looksOn(area('tee-fairway-hit'))).toBe(true);
    expect(text()).toContain('랜딩 센터라 O 로 자동 선택');
    await tap(/^R ?라이트$/);                                           // C 에서 R 로 바꾸면 자동으로 채운 O 도 걷힌다
    expect(looksOn(area('tee-fairway-hit'))).toBe(false);
    await tap(/^R ?라이트$/);                                           // 다시 눌러 해제
    expect(looksOn(one(/^R ?라이트$/))).toBe(false);
  });

  it('그린 (1온) 을 누르면 퍼팅 탭으로 가고, 필드샷 탭은 "필드샷이 없어요"를 보여 준다. 페어웨이 O 는 잠긴다', async () => {
    await newHole();
    await tap('DRIVER');
    await tap(/그린 \(1온\)/);
    expect(currentTab()).toBe('퍼팅');
    expect(puttCards().length).toBeGreaterThan(0);
    expect(openPutts()).toEqual([1]);
    await tapTab('field');
    expect(text()).toContain('티샷으로 그린에 올려서 필드샷이 없어요');
    await tapTab('tee');
    expect(area('tee-fairway-hit').disabled).toBe(true);
    await tap(/그린 \(1온\)/);                                         // 다시 누르면 1온 해제
    expect(area('tee-fairway-hit').disabled).toBe(false);
    expect((await stored()).s.teeGIR).toBe(false);
  });
});
