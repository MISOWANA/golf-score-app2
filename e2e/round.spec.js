// 처음 쓰는 사람이 이름을 넣고, 18홀을 끝까지 입력하고, 결과가 어느 화면에서나 같은 숫자로 보이는지.
import { test, expect, ME, COURSE, role, tap, login, startRound, playHole, enterHole, goTab, ROUND, ROUND_TOTAL, ROUND_PUTTS } from './kit.js';

const PAR = 72;
const DIFF = `+${ROUND_TOTAL - PAR}`;
const sum = (list) => list.reduce((s, h) => s + h.strokes, 0);
const textOf = { useInnerText: true };   // 칸 사이를 띄어 읽는다 (표의 숫자가 붙어 보이지 않게)

test('처음 쓰는 사람 — 이름 입력 → 새 라운드 → 18홀 입력 → 라운드 완료 → 리포트 · 홈 · 히스토리가 같은 숫자', async ({ page }) => {
  await login(page);
  await startRound(page);

  // ── 스코어 입력: 한 홀씩 넣을 때마다 맨 위 전체 스코어가 따라간다 ──
  for (let i = 0; i < 17; i++) {
    await playHole(page, i + 1, ROUND[i]);
    const done = ROUND.slice(0, i + 1);
    const over = sum(done) - 4 * done.length;
    await expect(role(page, 'progress-count')).toHaveText(`${i + 1}/18홀`);
    await expect(role(page, 'running-total')).toHaveText(`${sum(done)}(${over === 0 ? 'E' : `+${over}`})`);
  }
  await enterHole(page, ROUND[17]);
  await expect(role(page, 'next-hole')).toHaveCount(0);                // 마지막 홀에는 "다음 홀" 대신 "라운드 완료"
  await tap(role(page, 'finish-round'));

  // ── 라운드 리포트 ──
  await expect(page.getByText('라운드 리포트', { exact: true })).toBeVisible();
  const body = page.locator('body');
  await expect(body).toContainText(`${ROUND_TOTAL}타 (${DIFF})`, textOf);          // 요약 카드 첫 줄
  await expect(body).toContainText(`전반 9홀 ${sum(ROUND.slice(0, 9))}`, textOf);
  await expect(body).toContainText(`후반 9홀 ${sum(ROUND.slice(9))}`, textOf);
  const front = ROUND.slice(0, 9);
  await expect(body).toContainText(`스코어 ${front.map((h) => h.strokes).join(' ')} ${sum(front)} (+${sum(front) - 36})`, textOf);   // 홀별 기록 표
  await expect(body).toContainText(`퍼트 ${front.map((h) => h.putts).join(' ')}`, textOf);
  await expect(body).toContainText(`Score ${ROUND_TOTAL} (${DIFF}) Putts ${ROUND_PUTTS}`, textOf);

  // ── 홈: 최근 라운드 · 평균 스코어가 같은 숫자 ──
  await goTab(page, '홈');
  await expect(role(page, 'user-name')).toHaveText(ME);
  await expect(role(page, 'home-active-round')).toHaveCount(0);          // 끝난 라운드는 "진행 중"으로 남지 않는다
  await expect(role(page, 'home-stats')).toContainText('누적 라운드 1회', textOf);
  await expect(role(page, 'home-stats')).toContainText(`평균 스코어 ${ROUND_TOTAL}.0타`, textOf);
  const homeRow = page.getByRole('button').filter({ hasText: COURSE });
  await expect(homeRow).toContainText(`${ROUND_TOTAL} ${DIFF}`, textOf);

  // ── 히스토리: 같은 라운드, 같은 타수 ──
  await goTab(page, '히스토리');
  const card = page.getByRole('button').filter({ hasText: COURSE });
  await expect(card).toHaveCount(1);
  await expect(card).toContainText(`${ROUND_TOTAL} ${DIFF}`, textOf);

  // 히스토리 카드를 누르면 같은 리포트가 다시 열린다
  await tap(card);
  await expect(page.getByText('라운드 리포트', { exact: true })).toBeVisible();
  await expect(body).toContainText(`${ROUND_TOTAL}타 (${DIFF})`, textOf);
});
