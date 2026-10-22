// @vitest-environment jsdom
// 앱 전체를 jsdom 에 렌더링해 화면 사이의 흐름을 확인한다 (실제 IndexedDB 대신 fake-indexeddb).
// 브라우저(Chrome)로 직접 재현했던 문제들을 회귀 테스트로 고정한 것이다.
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { makeFullRound, makeHalfRound, makeNoParsRound, makeNineRound, makeActiveRound, played, defaultScore } from './test/fixtures.js';
import { summarizeRound } from './engine/roundSummary.js';
import { localNoonISO } from './engine/roundDate.js';

vi.setConfig({ testTimeout: 30000 });

const ME = '테스터';
let db;
let App;
let user;

// 모듈(연결을 들고 있는 db.js 포함)과 DB 를 새로 만들고, 로그인된 사용자·기록을 심는다
async function setup({ rounds = [], active = null } = {}) {
  globalThis.indexedDB = new IDBFactory();
  vi.resetModules();
  db = await import('./db.js');
  await db.initDB();
  user = await db.loginByName(ME);
  for (const r of rounds) await db.saveRound(r, user.userId);
  if (active) await db.saveActiveRound(user.userId, active);
  App = (await import('./GolfScoringApp.jsx')).default;
  render(<App />);
  await screen.findByText('새 라운드');   // 홈 화면
}

beforeEach(() => {
  // jsdom 에 없는 브라우저 기능
  window.scrollTo = () => {};
  Element.prototype.scrollIntoView = () => {};
  window.alert = vi.fn();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const tab = (label) => fireEvent.click(screen.getByTitle(label));

async function openReportFromHistory(courseName) {
  tab('히스토리');
  fireEvent.click(await screen.findByText(courseName));
  await screen.findByText('Round Report');
}

describe('진행 중인 라운드 보호', () => {
  it('히스토리 → 리포트의 "새 라운드 시작"도 진행 중 라운드 확인 창을 거친다 (덮어쓰지 않는다)', async () => {
    await setup({ rounds: [makeFullRound(1)], active: makeActiveRound() });
    await openReportFromHistory('남서울CC');

    fireEvent.click(screen.getByText('새 라운드 시작'));

    expect(await screen.findByText('진행 중인 라운드가 있어요')).toBeTruthy();
    expect(screen.queryByText('New Round')).toBeNull();                              // 설정 화면으로 바로 가지 않았다
    expect((await db.loadActiveRound([user.userId])).courseName).toBe('진행중CC');   // 진행 중 라운드 그대로
  });

  it('"기존 기록 삭제하고 새 라운드"는 한 번 더 확인한 뒤에만 지운다', async () => {
    await setup({ active: makeActiveRound() });
    fireEvent.click(screen.getByText('시작하기'));
    fireEvent.click(await screen.findByText('기존 기록 삭제하고 새 라운드'));

    // 확인 단계 — 입력한 홀 수를 알려 주고, 아직 아무것도 지우지 않았다
    expect(await screen.findByText(/입력한 3개 홀의 기록이 삭제돼요/)).toBeTruthy();
    expect(await db.loadActiveRound([user.userId])).not.toBeNull();

    // 돌아가기 → 처음 선택지로
    fireEvent.click(screen.getByText('돌아가기'));
    expect(screen.getByText('이어서 기록하기')).toBeTruthy();
    expect(await db.loadActiveRound([user.userId])).not.toBeNull();

    // 다시 눌러 확정하면 지우고 설정 화면으로
    fireEvent.click(screen.getByText('기존 기록 삭제하고 새 라운드'));
    fireEvent.click(await screen.findByText('삭제하고 새 라운드'));
    await screen.findByText('New Round');
    expect(await db.loadActiveRound([user.userId])).toBeNull();
  });

  it('이어하기 창 바깥을 누르면 아무것도 지우지 않고 닫힌다', async () => {
    await setup({ active: makeActiveRound() });
    fireEvent.click(screen.getByText('시작하기'));
    fireEvent.click(await screen.findByText('기존 기록 삭제하고 새 라운드'));
    fireEvent.click(screen.getByText('돌아가기'));
    // 오버레이(고정 위치 배경) 클릭
    const overlay = screen.getByText('진행 중인 라운드가 있어요').closest('div[style*="position: fixed"]');
    fireEvent.click(overlay);
    await waitFor(() => expect(screen.queryByText('진행 중인 라운드가 있어요')).toBeNull());
    expect(await db.loadActiveRound([user.userId])).not.toBeNull();
  });
});

describe('pars 가 없는 예전 백업 라운드', () => {
  it('스탯·인사이트·리포트 화면이 죽지 않는다', async () => {
    await setup({ rounds: [makeFullRound(1), makeNoParsRound(2)] });

    tab('스탯');
    await screen.findByText('Stats');
    expect(screen.queryByText('화면을 표시하지 못했어요')).toBeNull();

    tab('인사이트');
    await screen.findByText('Insights');
    expect(screen.queryByText('화면을 표시하지 못했어요')).toBeNull();

    await openReportFromHistory('예전백업CC');
    expect(screen.queryByText('화면을 표시하지 못했어요')).toBeNull();
  });
});

describe('입력하지 않은 홀이 있는 라운드의 리포트', () => {
  it('GIR 은 입력한 홀 기준으로 표시한다 (스탯·인사이트와 같은 분모)', async () => {
    const half = makeHalfRound(1);
    await setup({ rounds: [half] });
    const s = summarizeRound(half, ME);
    await openReportFromHistory('9홀연습장');
    expect(s.playedCount).toBe(9);
    expect(screen.getByText(`${s.girHoles}/9 holes`)).toBeTruthy();
    expect(screen.queryByText(/\/18 holes/)).toBeNull();
  });
});

describe('리포트 정보 수정', () => {
  const openEdit = async () => {
    await openReportFromHistory('남서울CC');
    fireEvent.click(screen.getByTitle('라운드 정보 수정'));
    await screen.findByText('라운드 정보 수정');
    return document.querySelector('input[type="date"]');
  };

  it('날짜를 비우고 저장하면 예외 없이 안내하고, 모달은 열려 있다', async () => {
    await setup({ rounds: [makeFullRound(1)] });
    const dateInput = await openEdit();
    fireEvent.change(dateInput, { target: { value: '' } });
    fireEvent.click(screen.getByText('저장'));

    expect((await screen.findByRole('alert')).textContent).toContain('날짜를 선택해 주세요');
    expect(screen.getByText('라운드 정보 수정')).toBeTruthy();
  });

  it('코스 이름을 비우고 저장해도 이유를 알려 준다', async () => {
    await setup({ rounds: [makeFullRound(1)] });
    await openEdit();
    fireEvent.change(screen.getByPlaceholderText('코스명'), { target: { value: '  ' } });
    fireEvent.click(screen.getByText('저장'));
    expect((await screen.findByRole('alert')).textContent).toContain('코스 이름');
  });

  it('날짜를 바꾸면 로컬 정오로 저장된다', async () => {
    await setup({ rounds: [makeFullRound(1)] });
    const dateInput = await openEdit();
    fireEvent.change(dateInput, { target: { value: '2026-08-15' } });
    fireEvent.click(screen.getByText('저장'));
    await waitFor(async () => {
      const [saved] = await db.loadRoundsByUser([user.userId]);
      expect(saved.date).toBe(localNoonISO('2026-08-15'));
    });
  });
});

describe('그린 놓친 방향 입력', () => {
  // 1번 홀(파4): 티샷 페어웨이 → 세컨샷 아이언 → 그린 놓침(GIR 실패) → 칩 입력 중
  const missingHoleRound = (gir) => {
    const round = makeActiveRound(ME, { currentHole: 0 });
    round.holes[0].scores[ME] = played(4, {
      teeClub: 'driver', shotShape: '스트레이트', fairway: true, fairwayHit: 'C',
      secondClub: 'iron', secondClubSub: '7I', remainingDistance: 150,
      gir, girAuto: false, strokes: 5, putts: 2, confirmed: false,
      extraShots: gir === false ? [{ club: 'wedge', subClub: '52', lie: [], remainingDistance: 20, onGreen: null }] : [],
    });
    return round;
  };
  const savedMiss = async () => (await db.loadActiveRound([user.userId])).holes[0].scores[ME].greenMiss;
  const openFieldStage = async () => {
    fireEvent.click(screen.getByText('이어서'));
    await screen.findByText('HOLE 1');
    fireEvent.click(screen.getAllByText('필드샷').find((el) => el.closest('button')).closest('button'));
  };

  it('그린을 놓친 홀의 필드샷 탭에 방향 선택이 나오고, 누르면 저장되며 다시 누르면 해제된다', async () => {
    await setup({ active: missingHoleRound(false) });
    await openFieldStage();

    const row = await waitFor(() => { const r = document.querySelector('[data-role="green-miss"]'); expect(r).toBeTruthy(); return r; });
    expect(row.textContent).toContain('놓친 방향');
    expect([...row.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['롱', '라이트', '숏', '레프트']);

    fireEvent.click(screen.getByText('라이트'));
    await waitFor(async () => expect(await savedMiss()).toBe('right'));

    fireEvent.click(screen.getByText('숏'));                      // 다른 방향으로 바꾸기
    await waitFor(async () => expect(await savedMiss()).toBe('short'));

    fireEvent.click(screen.getByText('숏'));                      // 같은 칩을 다시 누르면 해제
    await waitFor(async () => expect(await savedMiss()).toBeNull());
  });

  it('그린에 올린 홀에서는 묻지 않는다', async () => {
    await setup({ active: missingHoleRound(true) });
    await openFieldStage();
    await new Promise((r) => setTimeout(r, 50));
    expect(document.querySelector('[data-role="green-miss"]')).toBeNull();
  });
});

describe('9홀 라운드', () => {
  // 18홀 활성 라운드에서 한쪽 9홀만 입력하고 마지막(18번) 홀로 이동한 상태 (side: 'out' 앞 9홀 / 'in' 뒤 9홀) — 완료 버튼은 마지막 홀에만 있다
  const partialActive = (side) => {
    const r = makeHalfRound(1, ME, { id: `partial-${side}`, completed: false });
    delete r.finishedAt;
    if (side === 'in') {
      const full = makeFullRound(1);
      r.holes.forEach((h, idx) => { h.scores[ME] = idx >= 9 ? full.holes[idx].scores[ME] : defaultScore(h.par); });
    }
    r.currentHole = 17;
    return r;
  };
  const holeNumbersOf = (r) => r.holes.map((h) => h.holeNumber);
  const ONE_TO_NINE = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  it('설정에서 후반 9홀을 고르면 홀 번호는 1~9 이다 (10~18 을 보여 주지 않는다)', async () => {
    await setup();
    fireEvent.click(screen.getByText('시작하기'));
    await screen.findByText('New Round');

    fireEvent.click(screen.getByRole('radio', { name: /후반 9홀/ }));
    expect(screen.getByRole('radio', { name: /후반 9홀/ }).getAttribute('aria-checked')).toBe('true');
    // 파 표는 9홀만 — OUT 표는 없고 홀 번호 칸은 1~9
    expect(screen.queryByText('FRONT')).toBeNull();
    expect(document.querySelectorAll('[aria-label="파 증가"]')).toHaveLength(9);
    const headerRow = screen.getByText('TOT').parentElement;
    expect(headerRow.textContent).toContain('123456789');
    expect(headerRow.textContent).not.toMatch(/10|18/);

    fireEvent.change(screen.getByPlaceholderText('골프장 이름 검색...'), { target: { value: '직접입력CC' } });
    fireEvent.click(screen.getByText('화이트'));
    fireEvent.click(screen.getByText('라운드 시작하기'));

    await screen.findByText('HOLE 1');
    expect(screen.queryByText('HOLE 10')).toBeNull();
    expect(screen.getByText(/\/ 9 holes/)).toBeTruthy();
    const active = await db.loadActiveRound([user.userId]);
    expect(active.nine).toBe('in');
    expect(holeNumbersOf(active)).toEqual(ONE_TO_NINE);
    expect(active.pars).toHaveLength(9);
  });

  it('설정에서 18홀(기본)을 고르면 예전처럼 18홀이다', async () => {
    await setup();
    fireEvent.click(screen.getByText('시작하기'));
    await screen.findByText('New Round');
    expect(screen.getByRole('radio', { name: /^18홀/ }).getAttribute('aria-checked')).toBe('true');
    fireEvent.change(screen.getByPlaceholderText('골프장 이름 검색...'), { target: { value: '직접입력CC' } });
    fireEvent.click(screen.getByText('화이트'));
    fireEvent.click(screen.getByText('라운드 시작하기'));
    await screen.findByText('HOLE 1');
    expect(screen.getByText(/\/ 18 holes/)).toBeTruthy();
    expect((await db.loadActiveRound([user.userId])).holes).toHaveLength(18);
  });

  it('9홀 라운드(후반 코스)를 마지막 9번 홀에서 완료하면 9홀로 저장되고 리포트에 9홀로 표시된다', async () => {
    const active = makeNineRound(1, 'in', ME, { id: 'nine-active', completed: false, currentHole: 8 });
    delete active.finishedAt;
    // 앞 8홀은 입력됐고 마지막 홀(9번)만 비어 있다
    active.holes[8].scores[ME] = { ...active.holes[8].scores[ME], touched: false, confirmed: false, putts: 2, strokes: active.holes[8].par, gir: true };
    await setup({ active });

    fireEvent.click(screen.getByText('이어서'));
    await screen.findByText('HOLE 9');
    fireEvent.click(screen.getByRole('button', { name: /완료/ }));

    // 입력하지 않은 홀 확인 — 9번 홀이 비어 있다고 알려 준다
    expect(await screen.findByText(/입력하지 않은 홀이 있어요/)).toBeTruthy();
    expect(document.querySelector('[data-role="nine-finish-note"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /그대로 완료/ }));
    await screen.findByText('Round Report');
    const tag = document.querySelector('[data-role="nine-tag"]').textContent;
    expect(tag).toContain('9홀');
    expect(tag).not.toMatch(/후반|전반/);
    expect(screen.queryByText('FRONT 9')).toBeNull();
    expect(screen.queryByText('BACK 9')).toBeNull();
    expect(screen.getByText(/점선 칸 1개/)).toBeTruthy();

    const [saved] = await db.loadRoundsByUser([user.userId]);
    expect(saved.holes).toHaveLength(9);
    expect(holeNumbersOf(saved)).toEqual(ONE_TO_NINE);
    expect(saved.nine).toBe('in');
    expect(saved.completed).toBe(true);
    expect(await db.loadActiveRound([user.userId])).toBeNull();
  });

  it.each(['out', 'in'])('18홀로 시작해 한쪽(%s) 9홀만 입력하고 끝내면 "9홀로 완료" — 9홀 라운드(1~9번)로 저장된다', async (side) => {
    await setup({ active: partialActive(side) });
    fireEvent.click(screen.getByText('이어서'));
    await screen.findByText('HOLE 18');
    fireEvent.click(screen.getByRole('button', { name: /완료/ }));

    expect(await screen.findByText('9홀만 입력했어요')).toBeTruthy();
    const note = document.querySelector('[data-role="nine-finish-note"]').textContent;
    expect(note).toMatch(/9홀 라운드로 저장돼요/);
    expect(note).toMatch(/스탯·인사이트에서는 제외돼요/);
    expect(screen.queryByText('입력하지 않은 홀이 있어요')).toBeNull();
    expect((await db.loadRoundsByUser([user.userId])).length).toBe(0);   // 확인 전에는 저장하지 않았다

    fireEvent.click(screen.getByRole('button', { name: '9홀로 완료' }));
    await screen.findByText('Round Report');
    expect(document.querySelector('[data-role="nine-tag"]').textContent).toContain('9홀');
    expect(screen.queryByText('BACK 9')).toBeNull();

    const [saved] = await db.loadRoundsByUser([user.userId]);
    expect(saved.holes).toHaveLength(9);
    expect(holeNumbersOf(saved)).toEqual(ONE_TO_NINE);
    expect(saved.nine).toBe(side);
    expect(saved.pars).toHaveLength(9);
    expect(saved.holes.every((h) => h.scores[ME].touched === true)).toBe(true);   // 입력한 홀만 남았다 — 파로 채운 홀이 없다
    expect(saved.completed).toBe(true);
  });

  it('히스토리 카드에 9홀 표시가 붙고, 홈 평균 스코어는 18홀 라운드만으로 계산한다', async () => {
    const full = makeFullRound(1);
    const nine = makeNineRound(2, 'out');
    await setup({ rounds: [full, nine] });

    const total = full.holes.reduce((s, h) => s + h.scores[ME].strokes, 0);
    expect(document.querySelector('[data-role="home-stats"]').textContent).toContain(`${total}.0`);   // 18홀 하나의 합계 그대로
    expect(document.querySelector('[data-role="home-stats"]').textContent).toContain('2');            // 누적 라운드는 둘 다 센다

    tab('히스토리');
    await screen.findByText(nine.courseName);
    expect(document.querySelectorAll('[data-role="nine-badge"]')).toHaveLength(1);
  });

  it('9홀 라운드의 리포트는 히스토리에서 열린다 (통계에서 빠져도 기록은 남는다)', async () => {
    const nine = makeNineRound(2, 'in');
    await setup({ rounds: [makeFullRound(1), nine] });
    await openReportFromHistory(nine.courseName);
    expect(document.querySelector('[data-role="nine-tag"]').textContent).toContain('9홀');
    expect(screen.queryByText('화면을 표시하지 못했어요')).toBeNull();
  });

  describe('예전 방식(후반을 파로 채운 18홀)으로 저장된 기록', () => {
    it('앱을 열 때 9홀 라운드로 바뀐다 — 18홀 기록은 그대로이고 원본은 백업에 남는다', async () => {
      const full = makeFullRound(1);
      const half = makeHalfRound(2);
      await setup({ rounds: [full, half] });

      const saved = await db.loadRoundsByUser([user.userId]);
      const converted = saved.find((r) => r.id === half.id);
      expect(converted.holes).toHaveLength(9);
      expect(holeNumbersOf(converted)).toEqual(ONE_TO_NINE);
      expect(converted.nine).toBe('out');
      const keptFull = saved.find((r) => r.id === full.id);                           // 18홀 라운드는 손대지 않는다
      expect(keptFull.holes).toHaveLength(18);
      expect(keptFull.nine).toBeUndefined();
      expect(keptFull.holes.map((h) => h.scores[ME].strokes)).toEqual(full.holes.map((h) => h.scores[ME].strokes));

      const backup = await db.loadNineConversionBackup();
      expect(backup.rounds.map((r) => r.id)).toEqual([half.id]);
      expect(backup.rounds[0].holes).toHaveLength(18);                                // 원본(파로 채운 18홀)

      tab('히스토리');
      await screen.findByText(half.courseName);
      expect(document.querySelectorAll('[data-role="nine-badge"]')).toHaveLength(1);
    });

    it('변환된 라운드는 스탯에서 빠지고, 안내 문구가 그 수를 알려 준다 (18홀 평균이 바뀌지 않는다)', async () => {
      await setup({ rounds: [makeFullRound(1), makeFullRound(2), makeHalfRound(3)] });
      tab('스탯');
      await screen.findByText('Stats');
      expect(document.querySelector('[data-role="nine-excluded"]').textContent).toMatch(/9홀 라운드 1개는 집계에서 제외돼요/);
      expect(document.querySelector('[data-role="score-empty"]')).toBeNull();        // 18홀 2개로 평균을 낸다
    });
  });

  describe('스탯 · 인사이트는 18홀 라운드만 분석한다', () => {
    it('스탯 위에 9홀 제외 안내가 뜬다', async () => {
      await setup({ rounds: [makeFullRound(1), makeFullRound(2), makeNineRound(3, 'in')] });
      tab('스탯');
      await screen.findByText('Stats');
      expect(document.querySelector('[data-role="nine-excluded"]').textContent).toMatch(/9홀 라운드 1개는 집계에서 제외돼요/);
      expect(document.querySelector('[data-role="multi-excluded"]')).toBeNull();
    });

    it('인사이트 위에도 같은 안내가 뜬다', async () => {
      await setup({ rounds: [makeFullRound(1), makeFullRound(2), makeNineRound(3, 'out')] });
      tab('인사이트');
      await screen.findByText('Insights');
      expect(document.querySelector('[data-role="nine-excluded"]').textContent).toMatch(/9홀 라운드 1개는 집계에서 제외돼요/);
    });

    it('9홀 라운드만 있으면 스탯·인사이트는 빈 화면과 안내를 보여 주고 죽지 않는다', async () => {
      await setup({ rounds: [makeNineRound(1, 'out'), makeNineRound(2, 'in')] });
      tab('스탯');
      await screen.findByText('Stats');
      expect(screen.getByText('통계 데이터 부족')).toBeTruthy();
      expect(document.querySelector('[data-role="nine-excluded"]').textContent).toMatch(/9홀 라운드 2개는 집계에서 제외돼요/);
      expect(screen.queryByText('화면을 표시하지 못했어요')).toBeNull();

      tab('인사이트');
      await screen.findByText('Insights');
      expect(screen.getByText('분석할 데이터가 없습니다')).toBeTruthy();
      expect(document.querySelector('[data-role="nine-excluded"]').textContent).toMatch(/9홀 라운드 2개는 집계에서 제외돼요/);
      expect(screen.queryByText('화면을 표시하지 못했어요')).toBeNull();
    });
  });
});

describe('스탯 어프로치 — 그린을 놓친 방향', () => {
  // 앞에서부터 dirs.length 개 홀만 그린 미스(방향 기록)이고 나머지는 모두 그린에 올린 18홀 라운드
  const roundMissing = (dirs, i = 1) => {
    const r = makeFullRound(i);
    r.holes.forEach((h, idx) => {
      h.scores[ME] = idx < dirs.length
        ? played(h.par, { strokes: h.par + 1, putts: 2, gir: false, greenMiss: dirs[idx] })
        : played(h.par, { strokes: h.par, putts: 2, gir: true });
    });
    return r;
  };
  const openApproach = async () => {
    tab('스탯');
    await screen.findByText('Stats');
    fireEvent.click(document.querySelector('[data-role="stats-tab-approach"]'));
  };

  it('방향을 4번 이상 기록하면 방향별 비율과 한 줄 해석이 보인다', async () => {
    await setup({ rounds: [roundMissing(['right', 'right', 'right', 'short', 'left'])] });
    await openApproach();
    expect(document.querySelector('[data-role="card-green-miss"]')).toBeTruthy();
    expect(document.querySelector('[data-role="green-miss-count"]').textContent).toMatch(/그린을 놓친 5홀 중 방향을 기록한 홀 5/);
    expect(document.querySelector('[data-role="green-miss-bar"]')).toBeTruthy();
    expect(document.querySelector('[data-role="green-miss-take"]')).toBeTruthy();
    expect(document.querySelector('[data-role="green-miss-hint"]')).toBeNull();
  });

  it('방향 기록이 4번 미만이면 비율 대신 안내를 보여 준다', async () => {
    await setup({ rounds: [roundMissing(['right', 'short', null])] });
    await openApproach();
    expect(document.querySelector('[data-role="green-miss-count"]').textContent).toMatch(/그린을 놓친 3홀 중 방향을 기록한 홀 2/);
    expect(document.querySelector('[data-role="green-miss-bar"]')).toBeNull();
    expect(document.querySelector('[data-role="green-miss-hint"]')).toBeTruthy();
  });

  it('그린을 놓친 홀이 없으면 카드를 만들지 않는다', async () => {
    await setup({ rounds: [roundMissing([])] });
    await openApproach();
    expect(document.querySelector('[data-role="card-green-miss"]')).toBeNull();
  });
});

describe('홈', () => {
  it('최근 라운드를 누르면 그 라운드의 리포트가 열린다', async () => {
    await setup({ rounds: [makeFullRound(1)] });
    fireEvent.click(await screen.findByText('남서울CC'));
    await screen.findByText('Round Report');
  });
});

describe('새 라운드 설정', () => {
  const goSetup = async () => {
    fireEvent.click(screen.getByText('시작하기'));
    await screen.findByText('New Round');
  };

  it('시작할 수 없는 이유를 보여 주고, 채우면 사라진다', async () => {
    await setup();
    await goSetup();
    const blockers = () => document.querySelector('[data-role="start-blockers"]');

    expect(blockers().textContent).toContain('골프장 이름을 입력해 주세요');
    expect(blockers().textContent).toContain('TEE BOX를 선택해 주세요');
    expect(screen.getByText('라운드 시작하기').disabled).toBe(true);

    fireEvent.change(screen.getByPlaceholderText('골프장 이름 검색...'), { target: { value: '직접입력CC' } });
    expect(blockers().textContent).not.toContain('골프장 이름');
    fireEvent.click(screen.getByText('화이트'));

    expect(blockers()).toBeNull();
    expect(screen.getByText('라운드 시작하기').disabled).toBe(false);
  });

  it('OUT·IN 코스 이름을 비워도 시작되고 OUT·IN 으로 저장된다', async () => {
    await setup();
    await goSetup();
    fireEvent.change(screen.getByPlaceholderText('골프장 이름 검색...'), { target: { value: '직접입력CC' } });
    fireEvent.click(screen.getByText('화이트'));
    fireEvent.click(screen.getByText('라운드 시작하기'));

    await waitFor(async () => {
      const active = await db.loadActiveRound([user.userId]);
      expect(active).toMatchObject({ courseName: '직접입력CC', outCourseName: 'OUT', inCourseName: 'IN', teeBox: '화이트티' });
    });
  });
});
