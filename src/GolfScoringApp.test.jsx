// @vitest-environment jsdom
// 앱 전체를 jsdom 에 렌더링해 화면 사이의 흐름을 확인한다 (실제 IndexedDB 대신 fake-indexeddb).
// 브라우저(Chrome)로 직접 재현했던 문제들을 회귀 테스트로 고정한 것이다.
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { makeFullRound, makeHalfRound, makeNoParsRound, makeNineRound, makeMultiRound, makeActiveRound, played, defaultScore } from './test/fixtures.js';
import { summarizeRound } from './engine/roundSummary.js';
import { localNoonISO } from './engine/roundDate.js';

vi.setConfig({ testTimeout: 30000 });

const ME = '테스터';
let db;
let App;
let user;

// 모듈(연결을 들고 있는 db.js 포함)과 DB 를 새로 만들고, 로그인된 사용자·기록을 심는다
async function setup({ rounds = [], active = null, backupAtRounds = null, trashed = [], goals = null, clubs = null, prefs = null } = {}) {
  globalThis.indexedDB = new IDBFactory();
  vi.resetModules();
  db = await import('./db.js');
  await db.initDB();
  user = await db.loginByName(ME);
  for (const r of rounds) await db.saveRound(r, user.userId);
  if (active) await db.saveActiveRound(user.userId, active);
  if (backupAtRounds != null) await db.recordBackup(user.userId, { roundCount: backupAtRounds });
  if (goals) await db.saveGoals(user.userId, goals);
  if (clubs) await db.saveClubsForUser(user.userId, clubs);
  if (prefs) await db.savePrefs(user.userId, prefs);
  // 휴지통에 미리 넣어 둘 라운드 — { round, at(지운 시각) }
  for (const t of trashed) { await db.saveRound(t.round, user.userId); await db.trashRound(t.round, user.userId, t.at); }
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

describe('스코어 입력 — 홀 표의 SCORE · PUTT 줄', () => {
  const cellTexts = (row) => [...row.querySelectorAll('button')].map((b) => b.textContent);
  // 9홀씩 한 표(OUT · IN) — SCORE 줄과 그 아래 PUTT 줄의 글자
  const navTables = () => [...document.querySelectorAll('[data-role="nav-putts"]')].map((putt) => ({
    score: cellTexts(putt.previousElementSibling),
    putts: cellTexts(putt),
    puttLabel: putt.firstChild.textContent,
    scoreLabel: putt.previousElementSibling.firstChild.textContent,
  }));
  const resume = async (active) => {
    await setup({ active });
    fireEvent.click(screen.getByText('이어서'));
    await screen.findByText(/^HOLE \d+$/);
  };

  it('SCORE 줄 아래에 PUTT 줄이 있고, 입력한 홀은 숫자 · 입력하지 않은 홀은 - 로 보인다', async () => {
    const active = makeActiveRound();
    await resume(active);
    const [out, inn] = navTables();
    expect([out.scoreLabel, out.puttLabel]).toEqual(['SCORE', 'PUTT']);

    const entered = (key) => active.holes.slice(0, 3).map((h) => String(h.scores[ME][key]));
    expect(out.score).toEqual([...entered('strokes'), ...Array(6).fill('-')]);       // 1~3번 홀만 입력 — 나머지는 기본값(파)이 아니라 -
    expect(out.putts).toEqual([...entered('putts'), ...Array(6).fill('-')]);
    expect(inn.score).toEqual(Array(9).fill('-'));
    expect(inn.putts).toEqual(Array(9).fill('-'));
  });

  it('입력 중인 홀: 퍼트 수를 모르면 PUTT 는 - (스코어는 · ), 퍼트 수를 입력하면 그 수가 보인다', async () => {
    const active = makeActiveRound();
    const base = (i) => ({ ...defaultScore(active.holes[i].par), touched: true, confirmed: false, teeClub: '드라이버' });
    active.holes[3].scores[ME] = base(3);                                             // 티샷 클럽만 고른 홀 — 퍼팅은 아직 모름
    active.holes[4].scores[ME] = { ...base(4), putts: 3, puttsManual: true, strokes: active.holes[4].par + 1 };   // 퍼트 3개 입력
    await resume(active);
    const [out] = navTables();
    expect(out.score[3]).toBe('·');
    expect(out.putts[3]).toBe('-');
    expect(out.putts[4]).toBe('3');
    expect(out.putts[5]).toBe('-');
  });

  it('9홀 라운드는 9칸 한 표', async () => {
    const nine = makeNineRound(1, 'out', ME, { id: 'nine-nav', completed: false, currentHole: 0 });
    delete nine.finishedAt;
    nine.holes.forEach((h, i) => { if (i >= 2) h.scores[ME] = defaultScore(h.par); });
    await resume(nine);
    const tables = navTables();
    expect(tables).toHaveLength(1);
    expect(tables[0].putts.slice(2)).toEqual(Array(7).fill('-'));
    expect(tables[0].putts.slice(0, 2).every((t) => /^\d$/.test(t))).toBe(true);
  });

  it('동반자와 함께 기록할 때는 퍼트를 입력하지 않으므로 PUTT 줄이 없고, 입력하지 않은 홀은 - 로 보인다', async () => {
    const multi = makeMultiRound(1);
    multi.id = 'multi-active'; multi.completed = false; delete multi.finishedAt; multi.currentHole = 2;
    multi.holes.forEach((h, i) => { if (i >= 2) multi.players.forEach((p) => { h.scores[p] = defaultScore(h.par); }); });
    await resume(multi);
    expect(document.querySelector('[data-role="nav-putts"]')).toBeNull();
    const rows = [...document.querySelectorAll('[data-role="nav-score"]')];
    expect(rows.length).toBe(multi.players.length * 2);                               // 플레이어마다 OUT · IN 표에 한 줄씩
    rows.slice(0, multi.players.length).forEach((row) => {
      expect(cellTexts(row).slice(2)).toEqual(Array(7).fill('-'));
    });
  });
});

describe('인사이트 — 제목 · 상태 표시', () => {
  const openInsights = async (chapter) => {
    tab('인사이트');
    await screen.findByText('Insights');
    if (chapter) fireEvent.click(document.querySelector(`[data-role="insights-tab-${chapter}"]`));
  };
  const titles = () => [...document.querySelectorAll('[data-role="title-ko"]')].map((ko) => ({ ko: ko.firstChild.textContent, en: ko.nextElementSibling?.textContent }));

  it('상태 칩은 기호 없이 글자만 보인다 (심각 · 주의 · 참고 · 좋은 점)', async () => {
    await setup({ rounds: [makeFullRound(1), makeFullRound(2), makeFullRound(3)] });
    await openInsights();
    const chips = [...document.querySelectorAll('[data-insight-id]')].map((card) => card.firstElementChild.firstElementChild.textContent);
    expect(chips.length).toBeGreaterThan(0);
    chips.forEach((t) => expect(t).toMatch(/^(심각|주의|참고|좋은 점)$/));
  });

  it('섹션 제목은 한글이 위 줄, 영문이 아래 줄이다 (개선 포인트 · 스코어 기준 손실 등)', async () => {
    await setup({ rounds: [makeFullRound(1), makeFullRound(2), makeFullRound(3)] });
    await openInsights();
    expect(titles()).toContainEqual({ ko: '잘한 점', en: 'STRENGTHS' });
    expect(titles()).toContainEqual({ ko: '개선 포인트', en: 'IMPROVE' });

    fireEvent.click(document.querySelector('[data-role="insights-tab-strokes"]'));
    await waitFor(() => expect(titles().some((t) => t.en === 'SCORE BREAKDOWN')).toBe(true));
    expect(titles()).toContainEqual({ ko: '스코어 기준 손실 (파 대비)', en: 'SCORE BREAKDOWN' });
    // 한 줄 "영문 · 한글" 제목이 남아 있지 않다
    expect(document.body.textContent).not.toMatch(/SCORE BREAKDOWN · /);
  });

  it('(!) 설명 버튼은 한글 줄 끝에 붙는다', async () => {
    await setup({ rounds: [makeFullRound(1), makeFullRound(2), makeFullRound(3)] });
    await openInsights('strokes');
    await waitFor(() => expect(titles().some((t) => t.en === 'SCORE BREAKDOWN')).toBe(true));
    const ko = [...document.querySelectorAll('[data-role="title-ko"]')].find((el) => el.nextElementSibling?.textContent === 'SCORE BREAKDOWN');
    expect(ko.querySelector('[data-role="info-note"]')).toBeTruthy();
  });
});

// ── 백업 · 설정 · 핸디캡 · 라운드 요약 카드 (개편 1차) ────────────────────────────

// 다운로드는 링크 클릭으로 일어난다 — jsdom 에는 없는 URL.createObjectURL 과 링크 클릭을 가로채고, 만들어진 파일(Blob)을 모은다
function captureDownloads() {
  const blobs = [];
  URL.createObjectURL = vi.fn((b) => { blobs.push(b); return `blob:test-${blobs.length}`; });
  URL.revokeObjectURL = vi.fn();
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  return { blobs, click };
}

// 날짜 · 코스 이름이 다른 18홀 라운드 n 개 (i 번째는 "테스트CCi") — 히스토리에서 하나를 골라 열 수 있게 이름을 다르게 한다
const rounds18 = (n, from = 1) => Array.from({ length: n }, (_, k) => makeFullRound(from + k, ME, { courseName: `테스트CC${from + k}` }));

describe('홈 — 핸디캡 · 내 폼', () => {
  it('3라운드부터 핸디캡을 보여 주고, 그전에는 얼마나 더 필요한지 알려 준다', async () => {
    await setup({ rounds: rounds18(1) });
    expect(document.querySelector('[data-role="handicap-value"]').textContent).toBe('—');
    expect(document.querySelector('[data-role="handicap-sub"]').textContent).toMatch(/2라운드 더 쌓이면/);
    cleanup();

    await setup({ rounds: rounds18(4) });
    expect(document.querySelector('[data-role="handicap-value"]').textContent).toMatch(/^\d+\.\d$/);
    expect(document.querySelector('[data-role="home-handicap"]').textContent).toContain('핸디캡');
  });

  it('핸디캡 숫자는 엔진 계산과 같다 (화면 간 일치)', async () => {
    const rounds = rounds18(5);
    await setup({ rounds });
    const { buildHandicap, formatHandicap } = await import('./engine/handicap.js');
    expect(document.querySelector('[data-role="handicap-value"]').textContent).toBe(formatHandicap(buildHandicap(rounds, ME).index));
  });

  it('"내 폼" 카드는 3라운드부터 — 최근 평균이 보이고 누르면 스탯으로 간다', async () => {
    await setup({ rounds: rounds18(2) });
    expect(document.querySelector('[data-role="home-form"]')).toBeNull();
    cleanup();

    await setup({ rounds: rounds18(4) });
    const form = document.querySelector('[data-role="home-form"]');
    expect(form).toBeTruthy();
    expect(document.querySelector('[data-role="form-avg"]').textContent).toMatch(/^\d+\.\d타$/);
    fireEvent.click(form);
    await screen.findByText('Stats');
  });
});

describe('홈 — 백업 안내', () => {
  it('백업한 적이 없으면 안내 카드가 뜨고, 기록이 없으면 뜨지 않는다', async () => {
    await setup({ rounds: rounds18(2) });
    const nudge = document.querySelector('[data-role="home-backup-nudge"]');
    expect(nudge.getAttribute('data-level')).toBe('none');
    expect(nudge.textContent).toMatch(/아직 백업한 적이 없어요.*2라운드/);
    cleanup();

    await setup({ rounds: [] });
    expect(document.querySelector('[data-role="home-backup-nudge"]')).toBeNull();
  });

  it('"지금 백업"은 파일을 내려받고 마지막 백업 시각을 남겨서 안내가 사라진다', async () => {
    const { blobs, click } = captureDownloads();
    await setup({ rounds: rounds18(3) });
    fireEvent.click(document.querySelector('[data-role="nudge-backup"]'));

    await waitFor(() => expect(document.querySelector('[data-role="home-backup-nudge"]')).toBeNull());
    expect(click).toHaveBeenCalledTimes(1);
    const { parseBackupFile } = await import('./engine/backupStatus.js');
    const file = parseBackupFile(await blobs[0].text());
    expect(file.data.rounds).toHaveLength(3);
    expect(file.roundCount).toBe(3);
    expect(await db.getBackupMeta(user.userId)).toMatchObject({ roundCount: 3, via: 'download' });
  });

  it('백업 뒤 5라운드가 쌓이면 다시 권한다', async () => {
    await setup({ rounds: rounds18(6), backupAtRounds: 1 });
    const nudge = document.querySelector('[data-role="home-backup-nudge"]');
    expect(nudge.getAttribute('data-level')).toBe('stale');
    expect(nudge.textContent).toMatch(/그 뒤 5라운드가 쌓였어요/);
  });

  it('"자세히"는 설정 화면을 연다', async () => {
    await setup({ rounds: rounds18(2) });
    fireEvent.click(document.querySelector('[data-role="nudge-settings"]'));
    await screen.findByText('Settings');
    expect(document.querySelector('[data-role="settings-view"]')).toBeTruthy();
  });
});

describe('설정 화면', () => {
  const openSettings = async () => {
    fireEvent.click(document.querySelector('[data-role="open-settings"]'));
    await screen.findByText('Settings');
  };

  it('홈 위쪽 톱니 버튼으로 열고 뒤로 가면 홈으로 돌아온다', async () => {
    await setup({ rounds: rounds18(2) });
    await openSettings();
    fireEvent.click(screen.getByRole('button', { name: '뒤로' }));
    await screen.findByText('새 라운드');
  });

  it('백업 상태 · 기기 옮기기 4단계 · 저장 공간 · 앱 정보가 있다', async () => {
    await setup({ rounds: rounds18(2) });
    await openSettings();
    expect(document.querySelector('[data-role="backup-status"]').getAttribute('data-level')).toBe('none');
    expect(document.querySelectorAll('[data-role="move-steps"] li')).toHaveLength(4);
    await waitFor(() => expect(document.querySelector('[data-role="storage-state"]')).toBeTruthy());
    expect(document.querySelector('[data-role="app-version"]').textContent).not.toBe('—');   // 테스트에서는 'test'
    expect(document.querySelector('[data-role="settings-view"]').textContent).toContain('2라운드');
  });

  it('백업 파일 저장: 파일을 내려받고 상태가 "마지막 백업 오늘"로 바뀐다', async () => {
    const { blobs, click } = captureDownloads();
    await setup({ rounds: rounds18(3) });
    await openSettings();
    fireEvent.click(document.querySelector('[data-role="backup-download"]'));
    await waitFor(() => expect(document.querySelector('[data-role="backup-status"]').textContent).toMatch(/마지막 백업 오늘/));
    expect(click).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[data-role="settings-note"]').textContent).toMatch(/백업 파일을 저장했어요.*birdie-buddy-테스터-\d{4}-\d{2}-\d{2}\.json/);
    expect(blobs[0].type).toBe('application/json');
    expect(await blobs[0].text()).not.toMatch(/\n/);                       // 들여쓰기 없는 한 줄 JSON
  });

  it('공유 시트를 쓸 수 없는 기기에서는 "공유로 보내기"가 없다', async () => {
    await setup({ rounds: rounds18(2) });
    await openSettings();
    expect(document.querySelector('[data-role="backup-share"]')).toBeNull();
  });

  it('공유 시트를 쓸 수 있으면 "공유로 보내기"로 파일을 공유하고 기록한다', async () => {
    captureDownloads();
    navigator.share = vi.fn().mockResolvedValue(undefined);
    navigator.canShare = vi.fn(() => true);
    try {
      await setup({ rounds: rounds18(2) });
      await openSettings();
      fireEvent.click(document.querySelector('[data-role="backup-share"]'));
      await waitFor(() => expect(document.querySelector('[data-role="settings-note"]').textContent).toMatch(/공유했어요/));
      const shared = navigator.share.mock.calls[0][0];
      expect(shared.files[0].name).toMatch(/^birdie-buddy-테스터-.*\.json$/);
      expect(await db.getBackupMeta(user.userId)).toMatchObject({ roundCount: 2, via: 'share' });
    } finally {
      delete navigator.share; delete navigator.canShare;
    }
  });

  it('공유 창을 닫으면 백업한 것으로 치지 않는다', async () => {
    captureDownloads();
    navigator.share = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' }));
    navigator.canShare = vi.fn(() => true);
    try {
      await setup({ rounds: rounds18(2) });
      await openSettings();
      fireEvent.click(document.querySelector('[data-role="backup-share"]'));
      await new Promise((r) => setTimeout(r, 50));
      expect(await db.getBackupMeta(user.userId)).toBeNull();
      expect(document.querySelector('[data-role="backup-status"]').getAttribute('data-level')).toBe('none');
    } finally {
      delete navigator.share; delete navigator.canShare;
    }
  });

  describe('백업에서 복원', () => {
    const pickFile = (file) => fireEvent.change(document.querySelector('[data-role="settings-view"] input[type="file"]'), { target: { files: [file] } });

    it('내보낸 파일을 복원하면 기록이 합쳐진다', async () => {
      const { serializeBackup } = await import('./engine/backupStatus.js');
      await setup({ rounds: rounds18(1) });
      await openSettings();
      const extra = makeFullRound(7, ME, { id: 'restored-1' });
      pickFile(new File([serializeBackup({ version: '1.0', userId: 'other', data: { rounds: [extra], clubs: [] } })], 'backup.json', { type: 'application/json' }));
      await waitFor(() => expect(window.alert).toHaveBeenCalled());
      expect(window.alert.mock.calls[0][0]).toMatch(/데이터를 가져왔습니다.*1개 라운드/);
      await waitFor(async () => expect((await db.loadRoundsByUser([user.userId])).map((r) => r.id)).toContain('restored-1'));
      expect(await db.getBackupMeta(user.userId)).toBeNull();               // 복원은 "백업"이 아니다
    });

    it('JSON 이 아니거나 더 새로운 형식의 파일은 이유를 알려 주고 아무것도 바꾸지 않는다', async () => {
      await setup({ rounds: rounds18(1) });
      await openSettings();
      pickFile(new File(['이건 JSON 이 아니에요'], 'a.json'));
      await waitFor(() => expect(window.alert).toHaveBeenCalledTimes(1));
      expect(window.alert.mock.calls[0][0]).toMatch(/백업 파일을 읽을 수 없어요/);

      pickFile(new File([JSON.stringify({ version: '2.0', data: { rounds: [] } })], 'b.json'));
      await waitFor(() => expect(window.alert).toHaveBeenCalledTimes(2));
      expect(window.alert.mock.calls[1][0]).toMatch(/새로운 형식.*갱신/);

      pickFile(new File(['{}'], 'c.txt'));
      await waitFor(() => expect(window.alert).toHaveBeenCalledTimes(3));
      expect(window.alert.mock.calls[2][0]).toMatch(/JSON 파일만/);
      expect(await db.loadRoundsByUser([user.userId])).toHaveLength(1);
    });
  });
});

describe('라운드 요약 카드 (Round Report 맨 위)', () => {
  it('리포트를 열면 카드가 점수 · KEY STATS 보다 먼저 나온다', async () => {
    const rounds = rounds18(4);
    await setup({ rounds });
    await openReportFromHistory(rounds[3].courseName);
    const card = document.querySelector('[data-role="round-card"]');
    expect(card).toBeTruthy();
    expect(card.textContent).toContain('라운드 요약');
    expect(card.compareDocumentPosition(screen.getByText('KEY STATS')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(card.compareDocumentPosition(screen.getByText('FRONT 9')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('총평 문장과 점수는 리포트·엔진과 같다 (화면 간 일치)', async () => {
    const rounds = rounds18(4);
    await setup({ rounds });
    await openReportFromHistory(rounds[3].courseName);
    const { buildRoundCard } = await import('./engine/roundCard.js');
    const latest = [...rounds].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const card = buildRoundCard(latest, rounds);
    const shown = document.querySelector('[data-role="card-headline"]').textContent;
    expect(shown).toBe(card.headline);
    expect(shown).toContain(`${summarizeRound(latest, ME).total}타`);
  });

  it('이전 18홀 라운드가 3개 이상이면 내 평균과 비교하고, 부족하면 안내한다', async () => {
    const rounds = rounds18(5);
    await setup({ rounds });
    await openReportFromHistory(rounds[4].courseName);
    const compare = document.querySelector('[data-role="card-compare"]');
    expect(compare.textContent).toMatch(/내 최근 4라운드 평균 대비/);
    expect(compare.querySelector('[data-role="compare-score"]')).toBeTruthy();
    cleanup();

    const few = rounds18(2);
    await setup({ rounds: few });
    await openReportFromHistory(few[1].courseName);
    expect(document.querySelector('[data-role="card-compare"]').textContent).toMatch(/3개 쌓이면/);
  });

  it('잘한 점 · 아쉬운 점은 각각 3개 이하이고 결론 칸이 하나 이상 있다', async () => {
    const rounds = rounds18(4);
    await setup({ rounds });
    await openReportFromHistory(rounds[3].courseName);
    const card = document.querySelector('[data-role="round-card"]');
    const sections = ['card-strengths', 'card-issues', 'card-focus'].filter((r) => card.querySelector(`[data-role="${r}"]`));
    expect(sections.length).toBeGreaterThanOrEqual(1);
    expect(card.querySelectorAll('[data-role="card-strengths"] li').length).toBeLessThanOrEqual(3);
    expect(card.querySelectorAll('[data-role="card-issues"] li').length).toBeLessThanOrEqual(3);
  });

  it('9홀 라운드는 카드가 있고 평균 비교에서 빠진다고 알려 준다', async () => {
    const nine = makeNineRound(2, 'out');
    await setup({ rounds: [...rounds18(4), nine] });
    await openReportFromHistory(nine.courseName);
    expect(document.querySelector('[data-role="card-compare"]').textContent).toMatch(/9홀 라운드는 평균 비교에서 빠져요/);
  });

  it('동반자와 함께 기록한 라운드에는 카드가 없다', async () => {
    const multi = makeMultiRound(1);
    await setup({ rounds: [multi] });
    await openReportFromHistory(multi.courseName);
    expect(document.querySelector('[data-role="round-card"]')).toBeNull();
  });

  it('라운드를 끝내면 첫 화면이 카드가 있는 리포트다', async () => {
    const rounds = rounds18(3);
    const active = makeHalfRound(9, ME, { id: 'fin-1', completed: false, courseName: '방금CC' });
    delete active.finishedAt;
    active.holes.forEach((h, i) => { if (i >= 9) h.scores[ME] = played(h.par, { strokes: h.par, putts: 2 }); });
    active.currentHole = 17;
    await setup({ rounds, active });
    fireEvent.click(screen.getByText('이어서'));
    await screen.findByText('HOLE 18');
    fireEvent.click(screen.getByRole('button', { name: /완료/ }));
    await screen.findByText('Round Report');
    expect(document.querySelector('[data-role="round-card"]')).toBeTruthy();
  });

  describe('이미지 저장 · 공유', () => {
    const mockImage = () => vi.doMock('./share/reportImage.js', () => ({ renderReportImage: async () => new Blob(['png-bytes'], { type: 'image/png' }) }));

    it('공유 시트가 없으면 PNG 로 저장한다', async () => {
      mockImage();
      const { blobs, click } = captureDownloads();
      const rounds = rounds18(4);
      await setup({ rounds });
      await openReportFromHistory(rounds[3].courseName);
      fireEvent.click(document.querySelector('[data-role="share-image"]'));
      await waitFor(() => expect(document.querySelector('[data-role="share-note"]')?.textContent).toMatch(/이미지를 저장했어요/));
      expect(click).toHaveBeenCalledTimes(1);
      expect(blobs[0].type).toBe('image/png');
      vi.doUnmock('./share/reportImage.js');
    });

    it('공유 시트가 되면 이미지 파일을 공유한다', async () => {
      mockImage();
      captureDownloads();
      navigator.share = vi.fn().mockResolvedValue(undefined);
      navigator.canShare = vi.fn(() => true);
      try {
        const rounds = rounds18(4);
        await setup({ rounds });
        await openReportFromHistory(rounds[3].courseName);
        fireEvent.click(document.querySelector('[data-role="share-image"]'));
        await waitFor(() => expect(document.querySelector('[data-role="share-note"]')?.textContent).toMatch(/공유했어요/));
        const arg = navigator.share.mock.calls[0][0];
        expect(arg.files[0].name).toMatch(/^birdie-buddy-.*\.png$/);
        expect(arg.files[0].type).toBe('image/png');
      } finally {
        delete navigator.share; delete navigator.canShare;
        vi.doUnmock('./share/reportImage.js');
      }
    });

    it('이미지를 만들지 못하면 알려 준다', async () => {
      vi.doMock('./share/reportImage.js', () => ({ renderReportImage: async () => { throw new Error('canvas'); } }));
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const rounds = rounds18(4);
      await setup({ rounds });
      await openReportFromHistory(rounds[3].courseName);
      fireEvent.click(document.querySelector('[data-role="share-image"]'));
      await waitFor(() => expect(document.querySelector('[data-role="share-note"]')?.textContent).toMatch(/이미지를 만들지 못했어요/));
      vi.doUnmock('./share/reportImage.js');
    });
  });
});

describe('샷 정보 — 라이 · 지형 · 거리 · 클럽은 필수, 나머지는 선택', () => {
  // i번 홀(파는 홀에서) 상세 입력 중: 티샷 드라이버 + 퍼트 확정까지 입력한 상태 (구질·페어웨이·랜딩은 비어 있다)
  const shotRound = (over = {}, hole = 0) => {
    const round = makeActiveRound(ME, { currentHole: hole });
    const par = round.holes[hole].par;
    round.holes[hole].scores[ME] = played(par, {
      confirmed: false, teeClub: 'driver', putts: 2, puttsManual: true, strokes: par, gir: true, girAuto: false, onGreen: true, ...over,
    });
    return round;
  };
  const saved = async (hole = 0) => (await db.loadActiveRound([user.userId])).holes[hole].scores[ME];
  const resume = async (active, label = 'HOLE 1') => {
    await setup({ active });
    fireEvent.click(screen.getByText('이어서'));
    await screen.findByText(label);
  };
  const openTab = async (name) => {
    const tab = await waitFor(() => { const t = document.querySelector(`[data-role="shot-tab-${name}"]`); expect(t).toBeTruthy(); return t; });
    fireEvent.click(tab);
  };
  const nextButton = () => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === '다음');
  const second = { secondClub: 'iron', secondClubSub: '7I', remainingDistance: 150 };

  it('티샷 클럽만 골라도 필드샷 탭이 열린다 (구질 · 페어웨이 · 랜딩은 선택)', async () => {
    await resume(shotRound({ onGreen: null, gir: null }));
    expect(document.querySelector('[data-role="shot-tab-field"]').disabled).toBe(false);
    expect(document.querySelector('[data-role="shot-tab-putt"]').disabled).toBe(false);
    await openTab('field');
    await waitFor(() => expect(document.querySelector('[data-role="second-surface"]')).toBeTruthy());
  });

  it('티샷 탭: 선택 항목이 남았다고 알리고 바로 필드샷으로 넘어가는 버튼이 있다', async () => {
    await resume(shotRound({ onGreen: null, gir: null }));
    await openTab('tee');
    const note = await waitFor(() => { const n = document.querySelector('[data-role="tee-optional-note"]'); expect(n).toBeTruthy(); return n; });
    expect(note.textContent).toMatch(/선택 항목: 구질.*페어웨이 O\/X.*랜딩 L\/C\/R/);
    fireEvent.click(document.querySelector('[data-role="go-field"]'));
    await waitFor(() => expect(document.querySelector('[data-role="second-surface"]')).toBeTruthy());
  });

  it('티샷 클럽을 아직 안 골랐으면 필드샷 · 퍼팅 탭은 잠겨 있다', async () => {
    await resume(shotRound({ teeClub: null, onGreen: null, gir: null }));
    expect(document.querySelector('[data-role="shot-tab-field"]').disabled).toBe(true);
    expect(document.querySelector('[data-role="shot-tab-putt"]').disabled).toBe(true);
  });

  describe('세컨샷 지형 · 라이', () => {
    it('세 가지 지형과 라이 칩이 있다 ("필수" 글자는 붙이지 않고, 비어 있으면 확인 창이 짚는다)', async () => {
      await resume(shotRound({ ...second }));
      await openTab('field');
      const surface = await waitFor(() => { const r = document.querySelector('[data-role="second-surface"]'); expect(r).toBeTruthy(); return r; });
      expect([...surface.querySelectorAll('button')].map((b) => b.textContent.replace(/\s*★/, ''))).toEqual(['페어웨이', '러프', '벙커']);
      expect(surface.getAttribute('data-missing')).toBe('1');
      expect(surface.textContent).not.toContain('필수');
      const lie = document.querySelector('[data-role="second-lie"]');
      expect([...lie.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['평지', '오르막', '내리막', expect.stringContaining('기타')]);
      expect(lie.getAttribute('data-missing')).toBe('1');
      expect(lie.textContent).not.toContain('필수');
    });

    it('지형을 고르면 저장되고 다시 누르면 해제된다 — 비었는지 여부도 따라 바뀐다', async () => {
      await resume(shotRound({ ...second }));
      await openTab('field');
      const surface = () => document.querySelector('[data-role="second-surface"]');
      await waitFor(() => expect(surface()).toBeTruthy());
      fireEvent.click(document.querySelector('[data-role="second-surface-bunker"]'));
      await waitFor(async () => expect((await saved()).secondSurface).toBe('bunker'));
      await waitFor(() => expect(surface().getAttribute('data-missing')).toBe('0'));
      expect(document.querySelector('[data-role="second-surface-bunker"]').getAttribute('aria-pressed')).toBe('true');

      fireEvent.click(document.querySelector('[data-role="second-surface-rough"]'));        // 다른 지형으로 바꾸기
      await waitFor(async () => expect((await saved()).secondSurface).toBe('rough'));
      fireEvent.click(document.querySelector('[data-role="second-surface-rough"]'));        // 같은 칩을 다시 누르면 해제
      await waitFor(async () => expect((await saved()).secondSurface).toBeNull());
    });

    it('예전에 리커버리로 저장한 샷은 러프로 보이고 빠진 것으로 묻지 않는다', async () => {
      await resume(shotRound({ ...second, secondSurface: 'recovery' }));
      await openTab('field');
      const surface = await waitFor(() => { const r = document.querySelector('[data-role="second-surface"]'); expect(r).toBeTruthy(); return r; });
      expect(surface.getAttribute('data-missing')).toBe('0');
      expect(document.querySelector('[data-role="second-surface-rough"]').getAttribute('aria-pressed')).toBe('true');
    });

    it('라이: 평지 · 오르막 · 내리막은 한 번에, 슬라이스·훅이 섞인 라이는 "기타"에서', async () => {
      await resume(shotRound({ ...second }));
      await openTab('field');
      await waitFor(() => expect(document.querySelector('[data-role="second-lie"]')).toBeTruthy());
      fireEvent.click(document.querySelector('[data-role="second-lie-uphill"]'));
      await waitFor(async () => expect((await saved()).terrainCondition).toBe('uphill'));
      await waitFor(() => expect(document.querySelector('[data-role="second-lie"]').getAttribute('data-missing')).toBe('0'));
      fireEvent.click(document.querySelector('[data-role="second-lie-flat"]'));
      await waitFor(async () => expect((await saved()).terrainCondition).toBe('flat'));    // 평지도 입력한 값이다
      fireEvent.click(document.querySelector('[data-role="second-lie-more"]'));
      fireEvent.click(await screen.findByText('오르막 슬라이스'));
      await waitFor(async () => expect((await saved()).terrainCondition).toBe('uphill-slice'));
    });

    it('티샷 결과로 짐작한 지형에 ★ 를 붙이되, 눌러야 기록된다', async () => {
      await resume(shotRound({ ...second, fairway: false }));
      await openTab('field');
      const rough = await waitFor(() => { const b = document.querySelector('[data-role="second-surface-rough"]'); expect(b).toBeTruthy(); return b; });
      expect(rough.textContent).toContain('★');
      expect(document.querySelector('[data-role="second-surface"]').textContent).toMatch(/티샷 결과로는 러프/);
      expect((await saved()).secondSurface ?? null).toBeNull();                            // 자동으로 채우지 않는다
      fireEvent.click(rough);
      await waitFor(async () => expect((await saved()).secondSurface).toBe('rough'));
    });

    it('지형을 고르면 비어 있던 페어웨이 O/X 가 채워지고, 지형을 바꾸면 따라 바뀐다', async () => {
      await resume(shotRound({ ...second }));
      await openTab('field');
      await waitFor(() => expect(document.querySelector('[data-role="second-surface"]')).toBeTruthy());
      fireEvent.click(document.querySelector('[data-role="second-surface-fairway"]'));
      await waitFor(async () => expect(await saved()).toMatchObject({ fairway: true, fairwayDerived: true }));
      fireEvent.click(document.querySelector('[data-role="second-surface-bunker"]'));
      await waitFor(async () => expect((await saved()).fairway).toBe(false));              // 페어웨이 벙커는 페어웨이가 아니다
      fireEvent.click(document.querySelector('[data-role="second-surface-bunker"]'));      // 지형을 지우면 채웠던 값도 지운다
      await waitFor(async () => expect(await saved()).toMatchObject({ fairway: null, fairwayDerived: false }));
    });

    it('직접 누른 페어웨이 O/X 는 지형이 바꾸지 않는다', async () => {
      await resume(shotRound({ ...second, fairway: true }));
      await openTab('field');
      await waitFor(() => expect(document.querySelector('[data-role="second-surface"]')).toBeTruthy());
      fireEvent.click(document.querySelector('[data-role="second-surface-rough"]'));
      await waitFor(async () => expect((await saved()).secondSurface).toBe('rough'));
      expect((await saved()).fairway).toBe(true);
    });
  });

  describe('다음 · 완료 — 빠진 샷 정보 확인', () => {
    const filled = { ...second, terrainCondition: 'flat', secondSurface: 'fairway' };

    it('라이 · 지형이 비어 있으면 한 번 짚어 주고, "그대로 다음 홀"로 넘어갈 수 있다', async () => {
      await resume(shotRound({ ...second }));
      fireEvent.click(nextButton());
      const ask = await waitFor(() => { const a = document.querySelector('[data-role="hole-check"]'); expect(a).toBeTruthy(); return a; });
      expect(ask.textContent).toContain('샷 정보가 비어 있어요');
      expect([...ask.querySelectorAll('[data-role="info-ask-gap"]')].map((g) => g.textContent)).toEqual([expect.stringMatching(/세컨샷.*라이 · 지형$/)]);
      fireEvent.click(screen.getByRole('button', { name: '그대로 다음 홀' }));
      await screen.findByText('HOLE 2');
    });

    it('"입력하러 가기"는 비어 있는 샷의 필드샷 탭을 연다', async () => {
      await resume(shotRound({ ...second }));
      fireEvent.click(nextButton());
      fireEvent.click(await screen.findByText('입력하러 가기'));
      await waitFor(() => expect(document.querySelector('[data-role="second-surface"]')).toBeTruthy());
      expect(screen.queryByText('샷 정보가 비어 있어요')).toBeNull();
    });

    it('거리 · 클럽까지 비어 있으면 라이 · 지형 · 거리 · 클럽 순서로 알려 준다', async () => {
      await resume(shotRound({ remainingDistance: null }));
      fireEvent.click(nextButton());
      const ask = await waitFor(() => { const a = document.querySelector('[data-role="hole-check"]'); expect(a).toBeTruthy(); return a; });
      expect(ask.querySelector('[data-role="info-ask-gap"]').textContent).toMatch(/세컨샷 · 라이 · 지형 · 거리 · 클럽$/);
    });

    it('모두 채우면 확인 없이 다음 홀로 간다 (구질 · 랜딩 · 그린 랜딩 방향이 없어도)', async () => {
      await resume(shotRound({ ...filled }));
      fireEvent.click(nextButton());
      await screen.findByText('HOLE 2');
      expect(document.querySelector('[data-role="hole-check"]')).toBeNull();
    });

    it('파3: 티샷 거리가 비어 있으면 알려 준다', async () => {
      await resume(shotRound({ teeClub: 'iron', teeOnGreen: true, onGreen: null, gir: true }, 2), 'HOLE 3');
      fireEvent.click(nextButton());
      const ask = await waitFor(() => { const a = document.querySelector('[data-role="hole-check"]'); expect(a).toBeTruthy(); return a; });
      expect(ask.querySelector('[data-role="info-ask-gap"]').textContent).toMatch(/^티샷 · 거리$/);
    });

    it('추가 샷(써드샷)도 지형 · 라이를 받고, 저장된다', async () => {
      const extra = { club: 'wedge', subClub: '52', lie: [], surface: null, remainingDistance: 25, onGreen: true };
      await resume(shotRound({ ...filled, gir: false, onGreen: false, strokes: 5, extraShots: [extra] }));
      await openTab('field');
      const surface = await waitFor(() => { const r = document.querySelector('[data-role="extra-surface-0"]'); expect(r).toBeTruthy(); return r; });
      expect(surface.getAttribute('data-missing')).toBe('1');
      fireEvent.click(document.querySelector('[data-role="extra-surface-0-rough"]'));
      fireEvent.click(document.querySelector('[data-role="extra-lie-0-downhill"]'));
      await waitFor(async () => {
        const x = (await saved()).extraShots[0];
        expect(x.surface).toBe('rough');
        expect(x.lie).toBe('downhill');
      });
    });
  });

  describe('온그린 랜딩 방향은 선택', () => {
    it('방향을 고르지 않아도 퍼팅 입력이 열려 있다', async () => {
      await resume(shotRound({ putts: 2, puttsManual: true }));
      await openTab('putt');
      await waitFor(() => expect(document.querySelector('[data-role="putting-top"]')).toBeTruthy());
      expect(screen.queryByText(/랜딩 방향을 선택하면 퍼팅/)).toBeNull();
      expect(await screen.findByText('PUTT 1')).toBeTruthy();
    });
  });
});

describe('삭제 되돌리기 (휴지통)', () => {
  const openHistory = async () => { tab('히스토리'); await screen.findByText('History'); };
  const deleteRoundNamed = async (name) => {
    const card = (await screen.findByText(name)).closest('div[style*="border-radius"]');
    fireEvent.click(card.querySelector('button[aria-label="라운드 삭제"]'));
    fireEvent.click(await screen.findByRole('button', { name: '삭제' }));
  };
  const savedIds = async () => (await db.loadRoundsByUser([user.userId])).map((r) => r.id);

  it('삭제 확인 창이 휴지통에 7일 보관된다고 알려 준다', async () => {
    await setup({ rounds: rounds18(2) });
    await openHistory();
    const card = (await screen.findByText('테스트CC1')).closest('div[style*="border-radius"]');
    fireEvent.click(card.querySelector('button[aria-label="라운드 삭제"]'));
    expect(await screen.findByText(/휴지통에 7일 보관돼서 되돌릴 수 있어요/)).toBeTruthy();
  });

  it('지우면 목록에서 빠지고 "되돌리기" 안내가 뜨며, 누르면 그대로 돌아온다', async () => {
    const rounds = rounds18(2);
    await setup({ rounds });
    await openHistory();
    await deleteRoundNamed('테스트CC1');

    await waitFor(() => expect(screen.queryByText('테스트CC1')).toBeNull());
    expect(await savedIds()).toEqual([rounds[1].id]);                         // 라운드 목록에서는 빠졌다
    const toast = await screen.findByRole('status');
    expect(toast.textContent).toContain('테스트CC1 라운드를 삭제했어요');

    fireEvent.click(document.querySelector('[data-role="undo-delete"]'));
    expect(await screen.findByText('테스트CC1')).toBeTruthy();
    expect((await savedIds()).sort()).toEqual(rounds.map((r) => r.id).sort());
    expect(document.querySelector('[data-role="trash"]')).toBeNull();          // 휴지통도 비었다
    expect((await db.loadRoundsByUser([user.userId])).find((r) => r.id === rounds[0].id).holes).toEqual(rounds[0].holes);
  });

  it('되돌리기 안내를 놓쳐도 휴지통에서 복원할 수 있다', async () => {
    const rounds = rounds18(2);
    await setup({ rounds });
    await openHistory();
    await deleteRoundNamed('테스트CC1');
    await waitFor(() => expect(screen.queryByText('테스트CC1')).toBeNull());

    const toggle = document.querySelector('[data-role="trash-toggle"]');
    expect(toggle.textContent).toMatch(/휴지통 1개.*7일 보관/);
    fireEvent.click(toggle);
    const row = await waitFor(() => { const r = document.querySelector('[data-role="trash-row"]'); expect(r).toBeTruthy(); return r; });
    expect(row.textContent).toContain('테스트CC1');
    expect(row.textContent).toMatch(/7일 뒤 사라져요/);

    fireEvent.click(row.querySelector('[data-role="trash-restore"]'));
    await waitFor(() => expect(screen.getAllByText('테스트CC1').length).toBeGreaterThan(0));
    await waitFor(() => expect(document.querySelector('[data-role="trash"]')).toBeNull());
    expect((await savedIds())).toContain(rounds[0].id);
  });

  it('영구 삭제는 한 번 더 확인한 뒤에만 지운다', async () => {
    const rounds = rounds18(2);
    await setup({ rounds });
    await openHistory();
    await deleteRoundNamed('테스트CC1');
    await waitFor(() => expect(screen.queryByText('테스트CC1')).toBeNull());
    fireEvent.click(document.querySelector('[data-role="trash-toggle"]'));

    fireEvent.click(await waitFor(() => { const b = document.querySelector('[data-role="trash-purge"]'); expect(b).toBeTruthy(); return b; }));
    expect(document.querySelector('[data-role="trash-confirm"]').textContent).toMatch(/되돌릴 수 없어요/);
    expect((await db.listTrash([user.userId])).length).toBe(1);                // 아직 지우지 않았다

    fireEvent.click(document.querySelector('[data-role="trash-purge-confirm"]'));
    await waitFor(async () => expect(await db.listTrash([user.userId])).toEqual([]));
    expect(await savedIds()).toEqual([rounds[1].id]);
    await waitFor(() => expect(document.querySelector('[data-role="trash"]')).toBeNull());
  });

  it('지운 라운드는 홈의 누적 라운드와 통계에서 빠지고, 복원하면 돌아온다', async () => {
    await setup({ rounds: rounds18(4) });
    expect(document.querySelector('[data-role="home-stats"]').textContent).toContain('4회');
    await openHistory();
    await deleteRoundNamed('테스트CC1');
    await waitFor(() => expect(screen.queryByText('테스트CC1')).toBeNull());
    tab('홈');
    await screen.findByText('새 라운드');
    expect(document.querySelector('[data-role="home-stats"]').textContent).toContain('3회');
    await openHistory();
    fireEvent.click(document.querySelector('[data-role="trash-toggle"]'));
    fireEvent.click(await waitFor(() => { const b = document.querySelector('[data-role="trash-restore"]'); expect(b).toBeTruthy(); return b; }));
    await waitFor(() => expect(document.querySelector('[data-role="trash"]')).toBeNull());
    tab('홈');
    await screen.findByText('새 라운드');
    expect(document.querySelector('[data-role="home-stats"]').textContent).toContain('4회');
  });

  it('앱을 열 때 7일이 지난 휴지통 라운드는 정리하고 나머지는 남긴다', async () => {
    const DAY = 24 * 60 * 60 * 1000;
    const rounds = rounds18(3);
    await setup({ rounds: [rounds[2]], trashed: [{ round: rounds[0], at: new Date(Date.now() - 8 * DAY) }, { round: rounds[1], at: new Date(Date.now() - 2 * DAY) }] });
    await openHistory();
    const toggle = await waitFor(() => { const t = document.querySelector('[data-role="trash-toggle"]'); expect(t).toBeTruthy(); return t; });
    expect(toggle.textContent).toMatch(/휴지통 1개/);
    expect((await db.listTrash([user.userId])).map((r) => r.round.id)).toEqual([rounds[1].id]);
  });

  it('휴지통이 비어 있으면 휴지통 칸이 없다', async () => {
    await setup({ rounds: rounds18(2) });
    await openHistory();
    expect(document.querySelector('[data-role="trash"]')).toBeNull();
  });
});

describe('다음 라운드 목표', () => {
  const G = (metric, target, createdAt = '2026-01-01T00:00:00.000Z') => ({ id: `g-${metric}`, metric, target, createdAt });
  const sheet = () => document.querySelector('[data-role="goal-sheet"]');
  const savedGoals = async () => db.getGoals(user.userId);

  describe('홈 카드 · 목표 시트', () => {
    it('기록이 없으면 목표 카드가 없고, 기록이 있으면 정하도록 이끈다', async () => {
      await setup({ rounds: [] });
      expect(document.querySelector('[data-role="goals-empty"]')).toBeNull();
      cleanup();
      await setup({ rounds: rounds18(2) });
      expect(document.querySelector('[data-role="goals-empty"]').textContent).toContain('다음 라운드 목표를 정해 보세요');
    });

    it('목표를 정하면 저장되고 카드에 문장으로 보인다', async () => {
      await setup({ rounds: rounds18(4) });
      fireEvent.click(document.querySelector('[data-role="goal-add"]'));
      await waitFor(() => expect(sheet()).toBeTruthy());
      fireEvent.click(document.querySelector('[data-role="goal-metric-penalties"]'));
      expect(document.querySelector('[data-role="goal-metric-penalties"]').getAttribute('aria-pressed')).toBe('true');
      const before = document.querySelector('[data-role="goal-text"]').textContent;
      expect(before).toMatch(/^벌타 \d+개 이하$/);
      fireEvent.click(document.querySelector('[data-role="goal-plus"]'));
      expect(document.querySelector('[data-role="goal-text"]').textContent).not.toBe(before);
      fireEvent.click(document.querySelector('[data-role="goal-save"]'));

      await waitFor(() => expect(sheet()).toBeNull());
      const [g] = await savedGoals();
      expect(g).toMatchObject({ metric: 'penalties' });
      expect(document.querySelector('[data-role="goal-row-text"]').textContent).toBe(`벌타 ${g.target}개 이하`);
      expect(document.querySelector('[data-role="goal-row-progress"]').textContent).toBe('다음 라운드부터 판정해요');
    });

    it('목표값은 최근 라운드 평균을 보고 먼저 채워 주고, 평균도 보여 준다', async () => {
      await setup({ rounds: rounds18(4) });
      fireEvent.click(document.querySelector('[data-role="goal-add"]'));
      await waitFor(() => expect(sheet()).toBeTruthy());
      fireEvent.click(document.querySelector('[data-role="goal-metric-score"]'));
      const { recentAverage, suggestTarget } = await import('./engine/goals.js');
      const rounds = rounds18(4);
      expect(document.querySelector('[data-role="goal-target"]').textContent).toContain(String(suggestTarget('score', rounds)));
      expect(document.querySelector('[data-role="goal-recent"]').textContent).toMatch(new RegExp(`최근 4라운드 평균 .*${Math.round(recentAverage('score', rounds).avg)}`));
    });

    it('목표는 최대 2개 — 가득 차면 추가 버튼이 없고, 이미 쓴 지표는 고를 수 없다', async () => {
      await setup({ rounds: rounds18(4), goals: [G('threePutts', 2)] });
      fireEvent.click(document.querySelector('[data-role="goal-add"]'));
      await waitFor(() => expect(sheet()).toBeTruthy());
      expect(document.querySelector('[data-role="goal-metric-threePutts"]').disabled).toBe(true);
      fireEvent.click(document.querySelector('[data-role="goal-metric-penalties"]'));
      fireEvent.click(document.querySelector('[data-role="goal-save"]'));
      await waitFor(async () => expect(await savedGoals()).toHaveLength(2));
      await waitFor(() => expect(document.querySelector('[data-role="goal-add"]')).toBeNull());
    });

    it('목표를 눌러 값을 고치고 지울 수 있다', async () => {
      await setup({ rounds: rounds18(4), goals: [G('threePutts', 2)] });
      fireEvent.click(document.querySelector('[data-role="goal-row"]'));
      await waitFor(() => expect(sheet()).toBeTruthy());
      expect(document.querySelector('[data-role="goal-metric-penalties"]')).toBeNull();       // 고칠 때는 지표를 바꾸지 않는다
      fireEvent.click(document.querySelector('[data-role="goal-minus"]'));
      fireEvent.click(document.querySelector('[data-role="goal-save"]'));
      await waitFor(async () => expect((await savedGoals())[0].target).toBe(1));
      await waitFor(() => expect(document.querySelector('[data-role="goal-row-text"]').textContent).toBe('3퍼트 1회 이하'));

      fireEvent.click(document.querySelector('[data-role="goal-row"]'));
      await waitFor(() => expect(sheet()).toBeTruthy());
      fireEvent.click(document.querySelector('[data-role="goal-remove"]'));
      await waitFor(async () => expect(await savedGoals()).toEqual([]));
      await waitFor(() => expect(document.querySelector('[data-role="goals-empty"]')).toBeTruthy());
    });

    it('취소하면 아무것도 저장하지 않는다', async () => {
      await setup({ rounds: rounds18(4) });
      fireEvent.click(document.querySelector('[data-role="goal-add"]'));
      await waitFor(() => expect(sheet()).toBeTruthy());
      fireEvent.click(screen.getByRole('button', { name: '취소' }));
      await waitFor(() => expect(sheet()).toBeNull());
      expect(await savedGoals()).toEqual([]);
    });

    it('목표를 세운 뒤 쌓인 라운드로 "최근 N라운드 중 M번 달성"이 보인다', async () => {
      const rounds = rounds18(4);
      await setup({ rounds, goals: [G('score', 140)] });                                       // 140타 이하(최대값) — 모두 달성
      expect(document.querySelector('[data-role="goal-row-progress"]').textContent).toBe('최근 4라운드 중 4번 달성');
      expect(document.querySelectorAll('[data-role="goal-row"] [data-met="1"]')).toHaveLength(4);
    });
  });

  describe('라운드 리포트의 달성 판정', () => {
    it('이 라운드의 지표 값으로 달성 · 미달을 알려 준다', async () => {
      const rounds = rounds18(4);
      await setup({ rounds, goals: [G('score', 140), G('birdies', 9)] });
      await openReportFromHistory(rounds[3].courseName);
      const items = [...document.querySelectorAll('[data-role="card-goal"]')];
      expect(items).toHaveLength(2);
      const { goalValue } = await import('./engine/goals.js');
      const latest = [...rounds].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      expect(items[0].getAttribute('data-met')).toBe('1');
      expect(items[0].textContent).toContain(`스코어 140타 이하 → ${goalValue(latest, 'score')}타 달성`);
      expect(items[1].getAttribute('data-met')).toBe('0');
      expect(items[1].textContent).toMatch(/버디 이상 9개 이상 → \d+개 미달/);
      expect(items[0].textContent).toMatch(/최근 4라운드 중 4번 달성/);
    });

    it('목표를 정하기 전에 친 라운드는 판정하지 않는다', async () => {
      const rounds = rounds18(3);
      await setup({ rounds, goals: [G('score', 140, '2099-01-01T00:00:00.000Z')] });
      await openReportFromHistory(rounds[2].courseName);
      expect(document.querySelector('[data-role="card-goal"]')).toBeNull();
      expect(document.querySelector('[data-role="card-goals-note"]').textContent).toContain('정한 날부터 판정해요');
    });

    it('9홀 라운드는 목표를 판정하지 않는다고 알려 준다', async () => {
      const nine = makeNineRound(2, 'out');
      await setup({ rounds: [...rounds18(3), nine], goals: [G('score', 140)] });
      await openReportFromHistory(nine.courseName);
      expect(document.querySelector('[data-role="card-goals-note"]').textContent).toContain('9홀 라운드는 목표를 판정하지 않아요');
    });

    it('"이걸 목표로"는 포커스에 맞는 지표를 미리 골라 목표 시트를 연다', async () => {
      const rounds = rounds18(4);
      await setup({ rounds });
      await openReportFromHistory(rounds[3].courseName);
      const { buildRoundCard } = await import('./engine/roundCard.js');
      const { FOCUS_METRIC } = await import('./engine/goals.js');
      const latest = [...rounds].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      const card = buildRoundCard(latest, rounds);
      const metric = FOCUS_METRIC[card.focusCategory];
      expect(metric).toBeTruthy();
      fireEvent.click(document.querySelector('[data-role="focus-set-goal"]'));
      await waitFor(() => expect(sheet()).toBeTruthy());
      expect(document.querySelector(`[data-role="goal-metric-${metric}"]`).getAttribute('aria-pressed')).toBe('true');
      fireEvent.click(document.querySelector('[data-role="goal-save"]'));
      await waitFor(async () => expect((await savedGoals()).map((g) => g.metric)).toEqual([metric]));
      await waitFor(() => expect(document.querySelector('[data-role="focus-set-goal"]')).toBeNull());   // 이미 정했으니 버튼은 사라진다
    });
  });

  describe('라운드 중에 보이는 목표', () => {
    it('라운드 설정 화면에 오늘의 목표가 한 줄 보인다', async () => {
      await setup({ rounds: rounds18(2), goals: [G('threePutts', 2)] });
      fireEvent.click(screen.getByText('시작하기'));
      await screen.findByText('New Round');
      expect(document.querySelector('[data-role="goal-line"]').textContent).toContain('오늘의 목표 · 3퍼트 2회 이하');
    });

    it('목표가 없으면 아무것도 보이지 않는다', async () => {
      await setup({ rounds: rounds18(2) });
      fireEvent.click(screen.getByText('시작하기'));
      await screen.findByText('New Round');
      expect(document.querySelector('[data-role="goal-line"]')).toBeNull();
    });

    it('스코어 입력 화면에서는 지금까지의 값도 보여 준다 (낮을수록 좋은 지표가 목표를 넘으면 초과 표시)', async () => {
      const active = makeActiveRound(ME, { currentHole: 3 });
      active.holes.slice(0, 3).forEach((h) => { h.scores[ME] = played(h.par, { strokes: h.par + 1, putts: 3 }); });
      await setup({ active, goals: [G('threePutts', 2), G('birdies', 1)] });
      fireEvent.click(screen.getByText('이어서'));
      await screen.findByText('HOLE 4');
      const items = [...document.querySelectorAll('[data-role="goal-line-item"]')];
      expect(items).toHaveLength(2);
      expect(items[0].textContent).toContain('3퍼트 2회 이하');
      expect(items[0].querySelector('[data-role="goal-now"]').textContent).toMatch(/지금 3회 \(초과\)/);
      expect(items[1].querySelector('[data-role="goal-now"]').textContent).toMatch(/지금 0개$/);
    });
  });

  describe('인사이트 · 백업', () => {
    it('인사이트의 다음 라운드 포커스에서도 목표로 정할 수 있다', async () => {
      await setup({ rounds: rounds18(4) });
      tab('인사이트');
      await screen.findByText('Insights');
      fireEvent.click(document.querySelector('[data-role="insights-tab-next"]'));
      const btn = await waitFor(() => { const b = document.querySelector('[data-role="focus-set-goal"]'); expect(b).toBeTruthy(); return b; });
      fireEvent.click(btn);
      await waitFor(() => expect(sheet()).toBeTruthy());
      fireEvent.click(document.querySelector('[data-role="goal-save"]'));
      await waitFor(async () => expect(await savedGoals()).toHaveLength(1));
    });

    it('백업 파일에 목표가 들어가고, 복원하면 돌아온다', async () => {
      const { blobs } = captureDownloads();
      await setup({ rounds: rounds18(3), goals: [G('penalties', 1)] });
      fireEvent.click(document.querySelector('[data-role="nudge-backup"]'));
      await waitFor(() => expect(blobs.length).toBe(1));
      const { parseBackupFile } = await import('./engine/backupStatus.js');
      const file = parseBackupFile(await blobs[0].text());
      expect(file.data.goals).toEqual([G('penalties', 1)]);
    });
  });
});

describe('같은 코스 과거 기록 카드 (라운드 설정)', () => {
  // 남서울CC 를 친 i번째 라운드 — 4번 홀은 늘 +2, 12번 홀은 +1, 7번 홀에는 메모
  const at = (i, extra = {}) => {
    const r = makeFullRound(i, ME, { courseName: '남서울CC', id: `ns${i}`, ...extra });
    r.holes.forEach((h, idx) => { h.scores[ME] = played(h.par, { strokes: h.par + (idx === 3 ? 2 : idx === 11 ? 1 : 0), putts: 2, memo: idx === 6 && i === 3 ? '왼쪽 OB 조심' : '' }); });
    return r;
  };
  const openSetup = async () => { fireEvent.click(screen.getByText('시작하기')); await screen.findByText('New Round'); };
  const typeCourse = (name) => fireEvent.change(screen.getByPlaceholderText('골프장 이름 검색...'), { target: { value: name } });
  const card = () => document.querySelector('[data-role="course-history"]');

  it('이 코스를 친 적이 없으면 카드가 없다', async () => {
    await setup({ rounds: [at(1), at(2)] });
    await openSetup();
    expect(card()).toBeNull();
    typeCourse('처음가는CC');
    expect(card()).toBeNull();
  });

  it('코스 이름을 입력하면 횟수 · 최근 스코어 · 베스트가 나온다', async () => {
    await setup({ rounds: [at(1), at(2), at(3), at(4)] });
    await openSetup();
    typeCourse('남서울CC');
    await waitFor(() => expect(card()).toBeTruthy());
    expect(document.querySelector('[data-role="course-count"]').textContent).toBe('4번 쳤어요');
    expect(card().querySelectorAll('[data-role="course-recent"] > div')).toHaveLength(3);
    const { buildCourseHistory } = await import('./engine/courseHistory.js');
    const h = buildCourseHistory([at(1), at(2), at(3), at(4)], { courseName: '남서울CC', outName: '', inName: '', userName: ME });
    expect(document.querySelector('[data-role="course-best"]').textContent).toContain(`${h.best.total}타`);
    expect(card().textContent).toContain(`${h.recent[0].total}타`);
  });

  it('입력한 이름이 다른 코스로 바뀌면 카드가 사라진다', async () => {
    await setup({ rounds: [at(1), at(2)] });
    await openSetup();
    typeCourse('남서울CC');
    await waitFor(() => expect(card()).toBeTruthy());
    typeCourse('다른CC');
    await waitFor(() => expect(card()).toBeNull());
  });

  it('어려웠던 홀을 평균 순으로 보여 주고, 번호는 이번 라운드 번호다', async () => {
    await setup({ rounds: [at(1), at(2), at(3)] });
    await openSetup();
    typeCourse('남서울CC');
    await waitFor(() => expect(card()).toBeTruthy());
    const holes = [...document.querySelectorAll('[data-role="course-hard-hole"]')].map((e) => e.textContent);
    expect(holes).toHaveLength(2);
    expect(holes[0]).toMatch(/^4번 \+2/);
    expect(holes[1]).toMatch(/^12번 \+1/);
  });

  it('후반 9홀로 시작하면 그 9홀의 기록만 보고 번호는 1~9 로 부른다', async () => {
    await setup({ rounds: [at(1), at(2), at(3)] });
    await openSetup();
    typeCourse('남서울CC');
    fireEvent.click(screen.getByRole('radio', { name: /후반 9홀/ }));
    await waitFor(() => expect(card()).toBeTruthy());
    const holes = [...document.querySelectorAll('[data-role="course-hard-hole"]')].map((e) => e.textContent);
    expect(holes).toHaveLength(1);
    expect(holes[0]).toMatch(/^3번 \+1/);                                  // 18홀의 12번 = 후반 9홀의 3번째 홀
  });

  it('지난 홀 메모를 보여 준다', async () => {
    await setup({ rounds: [at(1), at(2), at(3)] });
    await openSetup();
    typeCourse('남서울CC');
    await waitFor(() => expect(card()).toBeTruthy());
    expect(document.querySelector('[data-role="course-memos"]').textContent).toContain('7번 홀 왼쪽 OB 조심');
  });

  it('9홀 라운드 기록은 "9홀"로 표시한다', async () => {
    const nine = makeNineRound(2, 'out', ME, { courseName: '남서울CC', id: 'nine-ns' });
    await setup({ rounds: [at(1), nine] });
    await openSetup();
    typeCourse('남서울CC');
    await waitFor(() => expect(card()).toBeTruthy());
    expect(card().querySelector('[data-role="course-recent"]').textContent).toContain('9홀');
  });
});

describe('개인 기록 배지 (라운드 리포트)', () => {
  // 모든 홀을 파 + over 로 친 라운드 — i 일, 코스 이름은 name
  const scored = (i, over, name) => {
    const r = makeFullRound(i, ME, { courseName: name ?? `기록CC${i}`, id: `rec${i}` });
    r.holes.forEach((h) => { h.scores[ME] = played(h.par, { strokes: h.par + over, putts: 2, gir: true }); });
    return r;
  };

  it('이전 기록을 깬 라운드는 맨 위에 금색 기록 배지가 뜬다', async () => {
    const rounds = [scored(1, 2), scored(2, 2), scored(3, 2), scored(4, 0, '대박CC')];
    await setup({ rounds });
    await openReportFromHistory('대박CC');
    const badge = await waitFor(() => { const b = document.querySelector('[data-role="card-record"][data-record="score"]'); expect(b).toBeTruthy(); return b; });
    expect(badge.textContent).toBe('베스트 스코어 72타 (이전 108타)');
    const cardEl = document.querySelector('[data-role="round-card"]');
    expect(cardEl.querySelector('[data-role="card-records"]').compareDocumentPosition(cardEl.querySelector('[data-role="card-headline"]')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();   // 총평보다 위
  });

  it('기록을 깨지 못한 라운드에는 배지가 없다', async () => {
    const rounds = [scored(1, 0), scored(2, 0), scored(3, 0), scored(4, 2, '평범CC')];
    await setup({ rounds });
    await openReportFromHistory('평범CC');
    expect(document.querySelector('[data-role="round-card"]')).toBeTruthy();
    expect(document.querySelector('[data-role="card-records"]')).toBeNull();
  });

  it('이전 라운드가 적으면 기록으로 치지 않는다 (처음 몇 라운드가 전부 신기록이 되지 않게)', async () => {
    const rounds = [scored(1, 2), scored(2, 0, '둘째CC')];
    await setup({ rounds });
    await openReportFromHistory('둘째CC');
    expect(document.querySelector('[data-role="card-records"]')).toBeNull();
  });

  it('옛 라운드의 리포트는 그 당시 기록으로 본다 (나중에 더 잘 친 라운드가 있어도 배지가 남는다)', async () => {
    const rounds = [scored(1, 2), scored(2, 2), scored(3, 2), scored(4, 1, '당시CC'), scored(9, 0, '최근CC')];
    await setup({ rounds });
    await openReportFromHistory('당시CC');
    expect(document.querySelector('[data-record="score"]').textContent).toBe('베스트 스코어 90타 (이전 108타)');
  });

  it('리포트 이미지에도 기록이 들어간다', async () => {
    let model = null;
    vi.doMock('./share/reportImage.js', () => ({ renderReportImage: async (m) => { model = m; return new Blob(['png'], { type: 'image/png' }); } }));
    captureDownloads();
    const rounds = [scored(1, 2), scored(2, 2), scored(3, 2), scored(4, 0, '대박CC')];
    await setup({ rounds });
    await openReportFromHistory('대박CC');
    fireEvent.click(document.querySelector('[data-role="share-image"]'));
    await waitFor(() => expect(model).toBeTruthy());
    expect(model.records).toEqual(['베스트 스코어 72타 (이전 108타)']);
    vi.doUnmock('./share/reportImage.js');
  });
});

describe('다음 · 완료 확인 창 통합 (샷 정보 + 퍼팅 수)', () => {
  const shotRound = (over = {}, hole = 0) => {
    const round = makeActiveRound(ME, { currentHole: hole });
    const par = round.holes[hole].par;
    round.holes[hole].scores[ME] = played(par, {
      confirmed: false, teeClub: 'driver', putts: 2, puttsManual: true, strokes: par, gir: true, girAuto: false, onGreen: true, ...over,
    });
    return round;
  };
  const filled = { secondClub: 'iron', secondClubSub: '7I', remainingDistance: 150, terrainCondition: 'flat', secondSurface: 'fairway' };
  const resume = async (active, label = 'HOLE 1') => {
    await setup({ active });
    fireEvent.click(screen.getByText('이어서'));
    await screen.findByText(label);
  };
  const nextButton = () => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === '다음');
  const checks = () => document.querySelectorAll('[data-role="hole-check"]');
  const saved = async (hole = 0) => (await db.loadActiveRound([user.userId])).holes[hole].scores[ME];

  it('확인할 게 없으면 창 없이 바로 다음 홀로 간다', async () => {
    await resume(shotRound({ ...filled }));
    fireEvent.click(nextButton());
    await screen.findByText('HOLE 2');
    expect(checks()).toHaveLength(0);
  });

  it('퍼팅 수만 모르면 퍼팅 수 창 하나 — 숫자 한 번으로 확정하고 넘어간다', async () => {
    await resume(shotRound({ ...filled, puttsManual: false, putts: 2 }));
    fireEvent.click(nextButton());
    const box = await waitFor(() => { const b = document.querySelector('[data-role="hole-check"]'); expect(b).toBeTruthy(); return b; });
    expect(box.getAttribute('data-info')).toBe('0');
    expect(box.getAttribute('data-putts')).toBe('1');
    expect(box.textContent).toContain('퍼팅을 몇 번 했나요?');
    expect(box.querySelector('[data-role="info-ask-gap"]')).toBeNull();
    fireEvent.click(box.querySelector('[data-role="putt-ask-3"]'));
    await screen.findByText('HOLE 2');
    expect(checks()).toHaveLength(0);
    expect((await saved(0))).toMatchObject({ putts: 3, puttsManual: true, confirmed: true });
  });

  it('샷 정보만 비었으면 샷 정보 창 하나 — "그대로 다음 홀"에 퍼팅 칸은 없다', async () => {
    await resume(shotRound({ secondClub: 'iron', remainingDistance: 150 }));
    fireEvent.click(nextButton());
    const box = await waitFor(() => { const b = document.querySelector('[data-role="hole-check"]'); expect(b).toBeTruthy(); return b; });
    expect(box.getAttribute('data-info')).toBe('1');
    expect(box.getAttribute('data-putts')).toBe('0');
    expect(box.querySelector('[data-role="putt-ask"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '그대로 다음 홀' }));
    await screen.findByText('HOLE 2');
    expect(checks()).toHaveLength(0);                                       // 연속으로 다른 창이 뜨지 않는다
  });

  it('둘 다 해당하면 한 창에 같이 나온다 — 퍼팅 수를 누르면 샷 정보는 비운 채 넘어가고 창은 더 뜨지 않는다', async () => {
    await resume(shotRound({ secondClub: 'iron', remainingDistance: 150, puttsManual: false }));
    fireEvent.click(nextButton());
    const box = await waitFor(() => { const b = document.querySelector('[data-role="hole-check"]'); expect(b).toBeTruthy(); return b; });
    expect(checks()).toHaveLength(1);
    expect(box.getAttribute('data-info')).toBe('1');
    expect(box.getAttribute('data-putts')).toBe('1');
    expect(box.querySelector('[data-role="info-ask-gap"]').textContent).toMatch(/세컨샷 · 라이 · 지형/);
    expect(box.querySelector('[data-role="putt-ask"]')).toBeTruthy();
    expect(box.textContent).toMatch(/숫자를 누르면 샷 정보는 비운 채 다음 홀로 이동해요/);
    fireEvent.click(box.querySelector('[data-role="putt-ask-2"]'));
    await screen.findByText('HOLE 2');
    expect(checks()).toHaveLength(0);
    expect((await saved(0)).putts).toBe(2);
  });

  it('둘 다 해당할 때 "입력하러 가기"는 홀을 확정하지 않고 샷 정보 입력으로 데려간다', async () => {
    await resume(shotRound({ secondClub: 'iron', remainingDistance: 150, puttsManual: false }));
    fireEvent.click(nextButton());
    fireEvent.click(await screen.findByText('입력하러 가기'));
    await waitFor(() => expect(document.querySelector('[data-role="second-surface"]')).toBeTruthy());
    expect(checks()).toHaveLength(0);
    expect((await saved(0)).confirmed).toBe(false);                         // 아직 확정하지 않았다
    expect(screen.queryByText('HOLE 2')).toBeNull();
  });

  it('둘 다 해당할 때 "취소"는 아무것도 바꾸지 않고 닫는다', async () => {
    await resume(shotRound({ secondClub: 'iron', remainingDistance: 150, puttsManual: false }));
    fireEvent.click(nextButton());
    fireEvent.click(await screen.findByRole('button', { name: '취소' }));
    await waitFor(() => expect(checks()).toHaveLength(0));
    expect((await saved(0)).confirmed).toBe(false);
  });

  it('마지막 홀 "완료"도 같은 한 창이다', async () => {
    const round = makeActiveRound(ME, { currentHole: 17 });
    round.holes[17].scores[ME] = played(4, { confirmed: false, teeClub: 'driver', putts: 2, puttsManual: false, strokes: 4, gir: true, girAuto: false, onGreen: true, secondClub: 'iron', remainingDistance: 150 });
    await resume(round, 'HOLE 18');
    fireEvent.click(screen.getByRole('button', { name: /완료/ }));
    const box = await waitFor(() => { const b = document.querySelector('[data-role="hole-check"]'); expect(b).toBeTruthy(); return b; });
    expect(box.getAttribute('data-info')).toBe('1');
    expect(box.getAttribute('data-putts')).toBe('1');
    expect(box.textContent).toMatch(/숫자를 누르면 샷 정보는 비운 채 완료해요/);
    fireEvent.click(box.querySelector('[data-role="putt-ask-2"]'));
    await waitFor(() => expect(checks()).toHaveLength(0));
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

describe('거리 단위 (미터 · 야드)', () => {
  const openSettings = async () => {
    fireEvent.click(document.querySelector('[data-role="open-settings"]'));
    await screen.findByText('Settings');
  };
  const checked = (id) => document.querySelector(`[data-role="unit-${id}"]`).getAttribute('aria-checked');
  const IRON = [{ id: 'iron7', name: '7i', type: 'Iron', carry: 130, total: 140 }];   // 140m = 153야드

  it('설정에 단위 선택이 있고 처음에는 미터다', async () => {
    await setup({ rounds: rounds18(2) });
    await openSettings();
    expect(document.querySelector('[data-role="unit-choice"]').getAttribute('role')).toBe('radiogroup');
    expect([checked('m'), checked('yd')]).toEqual(['true', 'false']);
    expect(document.querySelector('[data-role="unit-example"]').textContent).toMatch(/미터로/);
  });

  it('야드를 고르면 예시가 바뀌고 이 사용자의 설정으로 저장된다', async () => {
    await setup({ rounds: rounds18(2) });
    await openSettings();
    fireEvent.click(document.querySelector('[data-role="unit-yd"]'));
    expect([checked('m'), checked('yd')]).toEqual(['false', 'true']);
    expect(document.querySelector('[data-role="unit-example"]').textContent).toMatch(/샷 거리는 야드.*피트/);
    await waitFor(async () => expect(await db.getPrefs(user.userId)).toEqual({ unit: 'yd' }));
  });

  it('저장된 야드 설정은 앱을 다시 열어도 이어진다', async () => {
    await setup({ rounds: rounds18(2), prefs: { unit: 'yd' } });
    await openSettings();
    expect(checked('yd')).toBe('true');
  });

  it('마이백: 야드 모드에서는 클럽 거리가 야드로 보이고, 야드로 고친 값은 미터(소수 한 자리)로 저장된다', async () => {
    await setup({ clubs: IRON, prefs: { unit: 'yd' } });
    tab('MY BAG');
    const total = () => document.querySelector('[data-role="club-total-iron7"]').textContent;
    await waitFor(() => expect(total()).toBe('153'));
    expect(document.querySelector('[data-role="club-carry-iron7"]').textContent).toBe('142');   // 130m
    fireEvent.click(document.querySelector('[data-role="club-open-iron7"]'));
    const input = await waitFor(() => { const i = document.querySelector('[data-role="total-input"]'); expect(i).toBeTruthy(); return i; });
    expect(input.value).toBe('153');
    expect(screen.getByLabelText('토탈 거리(yd)')).toBe(input);
    fireEvent.click(document.querySelector('[data-role="total-up5"]'));
    expect(total()).toBe('158');
    fireEvent.click(await screen.findByText('저장'));
    await waitFor(async () => {
      const saved = await db.loadClubsByUser([user.userId]);
      expect(saved[0]).toMatchObject({ carry: 130, total: 144.5 });   // 158야드 = 144.5m, 캐리는 건드리지 않았다
    });
  });

  it('마이백: 같은 클럽을 미터로 보면 미터로 보인다 (소수 미터는 반올림)', async () => {
    await setup({ clubs: [{ ...IRON[0], total: 144.5 }] });
    tab('MY BAG');
    await waitFor(() => expect(document.querySelector('[data-role="club-total-iron7"]').textContent).toBe('145'));
  });

  it('보이는 값 그대로 다시 입력하면 저장된 미터 값을 건드리지 않는다 (변경으로 치지 않는다)', async () => {
    await setup({ clubs: IRON, prefs: { unit: 'yd' } });
    tab('MY BAG');
    fireEvent.click(await waitFor(() => { const b = document.querySelector('[data-role="club-open-iron7"]'); expect(b).toBeTruthy(); return b; }));
    const input = await waitFor(() => { const i = document.querySelector('[data-role="total-input"]'); expect(i).toBeTruthy(); return i; });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '153' } });
    fireEvent.blur(input);
    expect(document.querySelector('[data-role="bag-savebar"]')).toBeNull();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '160' } });
    fireEvent.blur(input);
    await waitFor(() => expect(document.querySelector('[data-role="bag-dirty"]')).toBeTruthy());
  });

  it('스코어 입력: 야드 모드에서는 남은 거리가 야드로 보인다', async () => {
    const round = makeActiveRound(ME, { currentHole: 0 });
    round.holes[0].scores[ME] = played(round.holes[0].par, { confirmed: false, teeClub: 'driver', secondClub: 'iron', secondClubSub: '7I', remainingDistance: 150, putts: 2, puttsManual: true });
    await setup({ active: round, prefs: { unit: 'yd' } });
    fireEvent.click(screen.getByText('이어서'));
    await screen.findByText('HOLE 1');
    fireEvent.click(await waitFor(() => { const t = document.querySelector('[data-role="shot-tab-field"]'); expect(t).toBeTruthy(); return t; }));
    await waitFor(() => expect(document.body.textContent).toContain('슬라이드로 1yd 단위 조정'));
    expect(document.body.textContent).toContain('164');   // 150m = 164야드
  });
  it('스코어 입력: 야드로 한 칸 올리면 미터(소수 한 자리)로 저장된다', async () => {
    const round = makeActiveRound(ME, { currentHole: 0 });
    round.holes[0].scores[ME] = played(round.holes[0].par, { confirmed: false, teeClub: 'driver', secondClub: 'iron', secondClubSub: '7I', remainingDistance: 150, putts: 2, puttsManual: true });
    await setup({ active: round, prefs: { unit: 'yd' } });
    fireEvent.click(screen.getByText('이어서'));
    await screen.findByText('HOLE 1');
    fireEvent.click(await waitFor(() => { const t = document.querySelector('[data-role="shot-tab-field"]'); expect(t).toBeTruthy(); return t; }));
    const shown = await waitFor(() => { const s = [...document.querySelectorAll('span')].find((x) => x.textContent === '164'); expect(s).toBeTruthy(); return s; });
    const plus = [...shown.parentElement.parentElement.querySelectorAll('button')].find((b) => b.textContent === '+');
    fireEvent.click(plus);
    await waitFor(() => expect([...document.querySelectorAll('span')].some((x) => x.textContent === '165')).toBe(true));
    await waitFor(async () => expect((await db.loadActiveRound([user.userId])).holes[0].scores[ME].remainingDistance).toBe(150.9));   // 165야드
  });

  it('백업 파일에 거리 단위가 들어 있으면 복원하면서 화면도 그 단위가 된다', async () => {
    const { serializeBackup } = await import('./engine/backupStatus.js');
    await setup({ rounds: rounds18(1) });
    await openSettings();
    expect(checked('m')).toBe('true');
    const file = new File([serializeBackup({ version: '1.0', userId: 'other', data: { rounds: [], clubs: [], prefs: { unit: 'yd' } } })], 'backup.json', { type: 'application/json' });
    fireEvent.change(document.querySelector('[data-role="settings-view"] input[type="file"]'), { target: { files: [file] } });
    await waitFor(() => expect(checked('yd')).toBe('true'));
    expect(await db.getPrefs(user.userId)).toEqual({ unit: 'yd' });
  });
});

// 거리 단위가 야드이면 어느 화면에도 "80m" 같은 미터 표기가 남지 않아야 한다 (미터 값을 그대로 찍은 곳을 찾는 그물)
describe('거리 단위 — 화면 전체 훑어보기', () => {
  const METER = /\d(?:\.\d+)?\s?m(?![A-Za-z/²])/g;
  // 홈 · 스탯 5개 영역 · 인사이트 6개 장 · 마이백 · 라운드 리포트를 차례로 열어, 글자에서 미터 표기를 모은다 (설명창(!)도 모두 연다)
  async function scanScreens() {
    const found = new Set();
    const collect = (where, text) => {
      for (const m of text.matchAll(METER)) found.add(`${where}: …${text.slice(Math.max(0, m.index - 20), m.index + m[0].length + 8)}`);
    };
    const scan = (where) => collect(where, document.body.textContent);
    const openNotes = (where) => {
      for (const b of [...document.querySelectorAll('[data-role="info-note"]')]) {
        fireEvent.click(b);
        collect(`${where}(!)`, document.querySelector('[data-role="info-note-body"]')?.textContent ?? '');
        const dlg = document.querySelector('[data-role="info-note-dialog"]');
        if (dlg) fireEvent.click(dlg);
      }
    };
    const open = (role) => waitFor(() => { const e = document.querySelector(`[data-role="${role}"]`); expect(e).toBeTruthy(); return e; });
    scan('홈');
    tab('스탯');
    for (const t of ['overview', 'tee', 'approach', 'putting', 'club']) {
      fireEvent.click(await open(`stats-tab-${t}`));
      scan(`스탯 ${t}`); openNotes(`스탯 ${t}`);
    }
    tab('인사이트');
    for (const t of ['overview', 'strokes', 'bigmiss', 'skills', 'next', 'records']) {
      fireEvent.click(await open(`insights-tab-${t}`));
      scan(`인사이트 ${t}`); openNotes(`인사이트 ${t}`);
    }
    tab('MY BAG');
    await open('club-total-iron7');
    scan('마이백'); openNotes('마이백');
    await openReportFromHistory('테스트CC3');
    scan('리포트'); openNotes('리포트');
    return [...found];
  }
  const CLUBS = [{ id: 'iron7', name: '7i', type: 'Iron', carry: 130, total: 140 }];

  it('미터 모드에서는 미터 표기가 보인다 (이 검사가 제대로 찾는지 확인)', async () => {
    await setup({ rounds: rounds18(8), clubs: CLUBS });
    expect((await scanScreens()).length).toBeGreaterThan(5);
  });

  it('야드 모드에서는 미터 표기가 하나도 남지 않는다', async () => {
    await setup({ rounds: rounds18(8), clubs: CLUBS, prefs: { unit: 'yd' } });
    expect(await scanScreens()).toEqual([]);
  });
});

describe('라운드 수정 (스코어 입력 위의 연필) — 파 · 그린 스피드', () => {
  const resume = async (active) => {
    await setup({ active });
    fireEvent.click(screen.getByText('이어서'));
    await screen.findByText('HOLE 4');
  };
  const openEdit = async () => {
    fireEvent.click(document.querySelector('[data-role="round-edit"]'));
    return screen.findByText('라운드 수정');
  };
  const savedSpeed = async () => (await db.loadActiveRound([user.userId])).greenSpeed;
  const pickPreset = (id) => fireEvent.click(document.querySelector(`[data-role="edit-green-speed"] [data-role="gs-preset-${id}"]`));
  const save = () => fireEvent.click(screen.getAllByText('저장').pop());

  it('연필 버튼으로 연 창에 파와 그린 스피드가 같이 있다', async () => {
    await resume(makeActiveRound(ME, { greenSpeed: 9 }));
    await openEdit();
    expect(document.querySelector('[data-role="edit-green-speed"]')).toBeTruthy();
    expect(document.querySelector('[data-role="edit-green-speed"] [data-role="gs-preset-medium"]').getAttribute('aria-pressed')).toBe('true');   // 지금 값(보통)이 골라져 있다
    expect(screen.getByText('TOTAL PAR')).toBeTruthy();
  });

  it('그린 스피드를 바꿔 저장하면 라운드에 반영되고 퍼팅 화면의 줄에도 보인다', async () => {
    await resume(makeActiveRound(ME, { greenSpeed: 9 }));
    await openEdit();
    pickPreset('fast');
    save();
    await waitFor(async () => expect(await savedSpeed()).toBe(10.5));
    await waitFor(() => expect(screen.queryByText('라운드 수정')).toBeNull());
  });

  it('단위는 미터가 기본이고, 이 창에서 피트로 바꿀 수 있다', async () => {
    await resume(makeActiveRound(ME, { greenSpeed: null }));
    await openEdit();
    const medium = () => document.querySelector('[data-role="edit-green-speed"] [data-role="gs-preset-medium"]').textContent;
    expect(medium()).toBe('보통2.7m');
    fireEvent.click(document.querySelector('[data-role="edit-green-speed"] [data-role="gs-unit-ft"]'));
    expect(medium()).toBe('보통9.0ft');
  });

  it('취소하면 그린 스피드는 그대로다', async () => {
    await resume(makeActiveRound(ME, { greenSpeed: 9 }));
    await openEdit();
    pickPreset('veryFast');
    fireEvent.click(screen.getByText('취소'));
    await waitFor(() => expect(screen.queryByText('라운드 수정')).toBeNull());
    expect(await savedSpeed()).toBe(9);
  });

  it('파만 고쳐도 그린 스피드는 그대로 남는다', async () => {
    await resume(makeActiveRound(ME, { greenSpeed: 10.5 }));
    await openEdit();
    fireEvent.click(document.querySelector('[data-role="edit-green-speed"]').closest('div[style*="overflow"]').querySelector('button[style*="right"]'));   // 첫 홀 파 +1
    save();
    await waitFor(async () => expect((await db.loadActiveRound([user.userId])).pars[0]).toBe(5));
    expect(await savedSpeed()).toBe(10.5);
  });

  it('값이 없던 라운드에도 정할 수 있고, "설정 안 함"으로 지울 수도 있다', async () => {
    await resume(makeActiveRound(ME, { greenSpeed: null }));
    await openEdit();
    pickPreset('slow');
    save();
    await waitFor(async () => expect(await savedSpeed()).toBe(7.5));
    await openEdit();
    fireEvent.click(document.querySelector('[data-role="edit-green-speed"] [data-role="gs-clear"]'));
    save();
    await waitFor(async () => expect(await savedSpeed()).toBeNull());
  });

  it('동반자가 있는 라운드에는 그린 스피드 칸이 없다 (퍼팅 분석은 1인 라운드만)', async () => {
    const multi = { ...makeMultiRound(1), id: 'active-multi', completed: false, currentHole: 3 };
    await setup({ active: multi });
    fireEvent.click(screen.getByText('이어서'));
    await screen.findByText('HOLE 4');
    await openEdit();
    expect(document.querySelector('[data-role="edit-green-speed"]')).toBeNull();
  });
});

describe('스코어 입력 — 비어 있는 거리 칸', () => {
  it('남은 거리가 비어 있으면 굵은 "—" 대신 가는 막대와 안내가 보이고, 옆으로 밀면 출발값에서 바뀐다', async () => {
    const round = makeActiveRound(ME, { currentHole: 0 });
    round.holes[0].scores[ME] = played(round.holes[0].par, { confirmed: false, teeClub: 'driver', secondClub: 'iron', secondClubSub: '7I', remainingDistance: null, putts: 2, puttsManual: true });
    await setup({ active: round });
    fireEvent.click(screen.getByText('이어서'));
    await screen.findByText('HOLE 1');
    fireEvent.click(await waitFor(() => { const t = document.querySelector('[data-role="shot-tab-field"]'); expect(t).toBeTruthy(); return t; }));
    const empty = await waitFor(() => { const e = document.querySelector('[data-role="empty-value"]'); expect(e).toBeTruthy(); return e; });
    const box = empty.parentElement;
    expect(box.textContent).not.toContain('—');
    const start = Number(box.textContent.match(/탭하면 (\d+)m부터 · 밀어서 조정/)[1]);
    fireEvent.mouseDown(box, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(window, { clientX: 120, clientY: 100 });
    fireEvent.mouseUp(window, { clientX: 120, clientY: 100 });
    await waitFor(async () => expect((await db.loadActiveRound([user.userId])).holes[0].scores[ME].remainingDistance).toBe(start + 5));   // 4px 마다 1m
    await waitFor(() => expect(document.querySelector('[data-role="empty-value"]')).toBeNull());
  });
});
