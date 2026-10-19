// ─── 라운드 이야기 — 인사이트 리포트의 흐름을 만드는 계산 ─────────────────────────────
//
// 리포트는 "공통 단위(타수)로 어디서 잃고 벌었나 → 큰 실수부터 → 부문별 진단 → 다음 연습" 순서로 읽힌다.
// 이 파일은 그 흐름에 필요한 파생 값만 만든다 (원 데이터는 strokesGained·shotStats·scoreBreakdown 이 계산):
//   buildLossShares     SG로 본 '투어 대비 잃은 타수'의 부문별 구성비 (롱게임 · 숏게임 · 퍼팅)
//   buildTeePenalty     티샷 OB율 — 평균이 가리는 큰 실수를 따로 센다 (OB는 2타, 러프는 그보다 훨씬 적게 잃는다)
//   buildPuttZone       1~2m(3~7피트) 퍼트 성공률 — 퍼팅 실력이 가장 많이 갈리는 구간
//   buildPrescriptions  가장 약한 부문에 맞춘 연습 게임과 목표

import { penaltyAt, penaltyCount } from './penalties.js';
import { SG_CATEGORIES } from './strokesGained.js';
import { PUTT_CAUSE_LABEL } from './puttAnalysis.js';

// 측정된 샷이 이만큼은 쌓여야 그 부문의 SG로 '가장 약한 곳'을 고른다
const MIN_MEASURED_STROKES = 6;

// ─── 부문별 구성비 ──────────────────────────────────────────────────────────────
// 투어 평균보다 잃은 타수(SG가 음수인 부문)만 모아 비중을 낸다. 롱게임 = 티샷 + 어프로치.
// 잃은 부문이 하나도 없으면 null.
export function buildLossShares(sg) {
  if (!sg?.categories) return null;
  const parts = SG_CATEGORIES.map((id) => ({
    id,
    loss: Math.max(0, -sg.categories[id].sg),
    strokes: sg.categories[id].strokes,
    measured: sg.categories[id].segments > 0,
  }));
  const total = parts.reduce((a, p) => a + p.loss, 0);
  if (!(total > 0)) return null;
  parts.forEach((p) => { p.pct = (p.loss / total) * 100; });
  const pct = (id) => parts.find((p) => p.id === id).pct;
  return {
    total, parts,
    longPct: pct('tee') + pct('approach'),
    shortPct: pct('shortGame'),
    puttingPct: pct('putting'),
  };
}

// ─── 티샷 OB율 ──────────────────────────────────────────────────────────────────
// 벌타가 샷별로 기록된 홀만 센다 — 위치를 모르는 벌타(예전 기록)가 있는 홀은 분모에서도 뺀다.
// 티샷 벌타 = 0번 샷에 기록된 OB·해저드·언플레이어블.
export function buildTeePenalty(rounds) {
  let teeShots = 0, ob = 0, other = 0, skipped = 0;
  rounds.forEach((r) => {
    const p = r.players[0];
    r.holes.forEach((h) => {
      const s = h.scores?.[p];
      if (!s || !s.touched || !s.teeClub) return;
      const count = penaltyCount(s);
      if ((s.penalties || []).length < count) { skipped += count; return; }
      teeShots++;
      const pen = penaltyAt(s, 0);
      if (!pen) return;
      if (pen.type === 'ob') ob++; else other++;
    });
  });
  return { teeShots, ob, other, skipped, obRate: teeShots > 0 ? ob / teeShots : null };
}

// ─── 1~2m 퍼트 구간 ────────────────────────────────────────────────────────────
// 3~7피트(0.9~2.1m). 최상위 퍼터가 가장 많이 버는 구간이고, 아마추어가 프로에게 잃는 타수의
// 46%도 여기서 나온다. 퍼트마다 거리와 홀인 결과가 기록된 것만 센다.
export const PUTT_ZONE_M = [0.9, 2.15];

export function buildPuttZone(rounds) {
  let made = 0, total = 0;
  rounds.forEach((r) => {
    const p = r.players[0];
    r.holes.forEach((h) => {
      const details = h.scores?.[p]?.puttDetails;
      if (!Array.isArray(details)) return;
      details.forEach((d) => {
        if (!d || d.holein == null || typeof d.distance !== 'number') return;
        if (d.distance < PUTT_ZONE_M[0] || d.distance > PUTT_ZONE_M[1]) return;
        total++;
        if (d.holein === 'success') made++;
      });
    });
  });
  return { made, total, ratePct: total > 0 ? (made / total) * 100 : null };
}

// ─── 연습 처방 ──────────────────────────────────────────────────────────────────
// 가장 약한 부문 하나를 고르고(SG가 충분히 측정됐으면 SG, 아니면 스코어 기준 손실 분해),
// 그 부문의 연습 게임과 목표를 돌려준다. 큰 실수가 눈에 띄면 그 카드를 하나 더 붙인다.
export const PRACTICE = {
  putting: {
    title: '10피트(약 3m) 퍼팅 게임',
    drill: '3m 안팎에서 홀아웃할 때까지 퍼트합니다. 원퍼트는 점수를 얻고 3퍼트는 더 크게 잃어요. +10점까지 몇 홀이 걸리는지 세고, 매번 홀과 경사를 바꿔 한 번 읽고 한 번만 치세요.',
    target: '+10점까지 투어 약 14홀 · 최상위 퍼터 약 11홀 · 평균 80타 약 24홀 · 90타 약 43홀',
  },
  shortGame: {
    title: '중앙값 게임 (숏게임)',
    drill: '100야드(약 91m) 페어웨이에서 다섯 번 쳐서, 홀에 세 번째로 가까운 공의 거리를 잽니다.',
    target: '투어 프로 16피트(약 4.9m) · 평균 90타 골퍼 37피트(약 11.3m)',
  },
  approach: {
    title: '125야드(114m) 근접도 도전',
    drill: '114m(125야드)에서 여러 번 쳐서 절반의 샷이 들어오는 홀까지 거리를 잽니다. 그린에 올랐는지보다 핀까지 거리를 기록하세요.',
    target: '투어 6.4m · 평균 90타 골퍼 13.7m (샷의 절반이 들어오는 거리)',
  },
  tee: {
    title: 'OB를 피하는 목표 지점 정하기',
    drill: 'OB·해저드가 있는 쪽의 반대로 목표 지점을 옮기세요. 목표 지점은 샷 패턴의 한가운데라, 조준선보다 안쪽으로 더 옮겨야 해요. OB 확률이 프로 1.5% · 80타 2% · 100타 3% 이하가 될 때까지 옮깁니다.',
    target: '티샷 OB율 2~3% 이하',
  },
  penalty: {
    title: '큰 숫자부터 막기',
    drill: '벌타와 끔찍한 샷이 난 홀의 공략 루트를 미리 정해 두세요. 위험한 홀은 거리를 줄이더라도 넓은 쪽으로 치고, 레이업은 그린 가까이 보내세요 (30야드 러프가 80야드 페어웨이보다 낫습니다).',
    target: '끔찍한 샷 점수 6점 이하 (90타 기준)',
  },
};

const SCORE_CATEGORY_TO_SKILL = { penalty: 'penalty', putting: 'putting', tee: 'tee', approach: 'approach', shortGame: 'shortGame' };

// SG로 가장 약한 부문 — 측정된 샷이 충분한 부문이 둘 이상이고 그중 가장 나쁜 쪽이 마이너스일 때.
// 아니면 스코어 기준 손실 분해 1위.
export function pickWeakestSkill({ sg, ranked }) {
  const measured = SG_CATEGORIES
    .map((id) => ({ id, sg: sg?.categories?.[id]?.sg ?? 0, n: sg?.categories?.[id]?.strokes ?? 0 }))
    .filter((x) => x.n >= MIN_MEASURED_STROKES);
  if (measured.length >= 2) {
    const worst = measured.reduce((a, b) => (b.sg < a.sg ? b : a));
    if (worst.sg < 0) return { skill: worst.id, basis: 'sg' };
  }
  const top = ranked?.[0];
  if (top && SCORE_CATEGORY_TO_SKILL[top.category]) return { skill: SCORE_CATEGORY_TO_SKILL[top.category], basis: 'score' };
  return null;
}

const fix1 = (v) => Number(v).toFixed(1);

export function buildPrescriptions(ctx) {
  const { sg, ranked, awful, awfulOverLimit, teePen, puttZone, puttCauses, approach110, scrambling, teeBias } = ctx;
  const pick = pickWeakestSkill({ sg, ranked });
  if (!pick) return { primary: null, cards: [] };

  const why = {
    putting: () => {
      const parts = [];
      if (puttZone?.total >= 5) parts.push(`퍼팅 실력이 갈리는 1~2m 구간 성공률 ${Math.round(puttZone.ratePct)}% (${puttZone.made}/${puttZone.total})`);
      if (puttCauses?.dominant) parts.push(`3퍼트 주원인은 ${PUTT_CAUSE_LABEL[puttCauses.dominant]}`);
      return parts.length ? parts.join(' · ') : null;
    },
    shortGame: () => (scrambling?.attempts > 0 ? `그린을 놓친 ${scrambling.attempts}홀 중 파 이상 세이브 ${Math.round(scrambling.ratePct)}%` : null),
    approach: () => (approach110 != null ? `110-140m 구간 근접도 중앙값 ${fix1(approach110)}m (그린을 놓친 샷 포함)` : null),
    tee: () => {
      const parts = [];
      if (teePen?.teeShots > 0) parts.push(`티샷 ${teePen.teeShots}개 중 OB ${teePen.ob}회 (${(teePen.obRate * 100).toFixed(1)}%)`);
      if (teeBias?.total > 0 && Math.abs(teeBias.biasIndex) > 0.15) parts.push(`티샷이 ${teeBias.biasIndex > 0 ? '우측' : '좌측'}으로 치우침`);
      return parts.length ? parts.join(' · ') : null;
    },
    penalty: () => (awful?.points > 0 || awful?.avgPoints > 0
      ? `끔찍한 샷 ${awful.rounds > 1 ? `라운드당 ${fix1(awful.avgPoints)}` : awful.points}점 (OB ${awful.ob}회 · 해저드·언플레이어블 ${awful.hazard + awful.unplayable}회)`
      : null),
  };
  const card = (skill) => ({ id: skill, skill, ...PRACTICE[skill], why: why[skill]() });

  const cards = [card(pick.skill)];
  const bigMiss = awfulOverLimit || (teePen?.teeShots >= 10 && teePen.obRate > 0.03);
  if (bigMiss && pick.skill !== 'penalty') cards.push(card('penalty'));
  return { primary: pick, cards };
}
