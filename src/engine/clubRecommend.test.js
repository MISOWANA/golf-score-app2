import { describe, it, expect } from 'vitest';
import { shotClubOf, recommendClubs, bagCoverage, fitText } from './clubRecommend.js';
import { CATALOG, readableInScoring, guessCategory, checkNewClub, toBagClubs } from './clubCatalog.js';
import { bagGaps, gapReport } from './bagStats.js';
import { createRng } from '../test/fixtures.js';

describe('shotClubOf — 마이백 클럽 → 스코어 입력의 클럽', () => {
  it.each([
    [{ type: 'Wood', name: 'Driver' }, { club: 'driver', subClub: null }],
    [{ type: 'Wood', name: '1W' }, { club: 'driver', subClub: null }],
    [{ type: 'Wood', name: '3W' }, { club: 'wood', subClub: '3W' }],
    [{ type: 'Hybrid', name: '4H' }, { club: 'hybrid', subClub: '4H' }],
    [{ type: 'Hybrid', name: '4U' }, { club: 'hybrid', subClub: '4H' }],
    [{ type: 'Iron', name: '7i' }, { club: 'iron', subClub: '7I' }],
    [{ type: 'Iron', name: '7번 아이언' }, { club: 'iron', subClub: '7I' }],
    [{ type: 'Wedge', name: 'PW' }, { club: 'wedge', subClub: 'P' }],
    [{ type: 'Wedge', name: '46°' }, { club: 'wedge', subClub: 'P' }],
    [{ type: 'Wedge', name: '52°' }, { club: 'wedge', subClub: '52' }],
    [{ type: 'Wedge', name: '52도' }, { club: 'wedge', subClub: '52' }],
  ])('%j', (club, expected) => {
    expect(shotClubOf(club)).toEqual(expected);
  });

  it('퍼터와 이름이 없는 클럽은 null 이다', () => {
    expect(shotClubOf({ type: 'Putter', name: 'Putter' })).toBeNull();
    expect(shotClubOf({ type: 'Iron', name: '' })).toBeNull();
    expect(shotClubOf(null)).toBeNull();
  });

  it('기본 14개 구성은 모두 추천에 쓸 수 있다', () => {
    const defaults = ['Driver', '3W', '5W', '4H', '5i', '6i', '7i', '8i', '9i', '46°', '52°', '56°', '60°'];
    defaults.forEach((name) => {
      const c = CATALOG.find((x) => x.name === name);
      expect(readableInScoring(c), name).toBe(true);
    });
  });
});

describe('recommendClubs', () => {
  const bag = [
    { id: 'driver', name: 'Driver', type: 'Wood', carry: 200, total: 215 },
    { id: 'i7', name: '7i', type: 'Iron', carry: 135, total: 140 },
    { id: 'i8', name: '8i', type: 'Iron', carry: 125, total: 130 },
    { id: 'w52', name: '52°', type: 'Wedge', carry: 85, total: 90 },
    { id: 'putter', name: 'Putter', type: 'Putter' },
  ];

  it('남은 거리가 구간 안이면 그 클럽을 추천한다', () => {
    const r = recommendClubs(bag, 137);
    expect(r.primary.name).toBe('7i');
    expect(r.fit).toBe('in');
    expect(r.shorter.name).toBe('8i');
  });

  it('가장 긴 클럽도 모자라면 edge=longest', () => {
    const r = recommendClubs(bag, 260);
    expect(r.primary.name).toBe('Driver');
    expect(r.fit).toBe('under');
    expect(r.edge).toBe('longest');
    expect(fitText(r)).toMatch(/모자라요/);
  });

  it('거리가 0 이하이거나 마이백이 없으면 null', () => {
    expect(recommendClubs(bag, 0)).toBeNull();
    expect(recommendClubs(bag, -5)).toBeNull();
    expect(recommendClubs(null, 100)).toBeNull();
    expect(recommendClubs([], 100)).toBeNull();
  });

  it('거리를 확인하지 않은(unset) 클럽은 추천하지 않는다', () => {
    const r = recommendClubs([{ id: 'a', name: '7i', type: 'Iron', carry: 135, total: 140, unset: true }], 137);
    expect(r).toBeNull();
  });

  it('같은 스코어 입력 클럽이 둘이면(PW·46°) 마이백 순서상 앞의 것만 쓴다', () => {
    const r = recommendClubs([
      { id: 'pw', name: 'PW', type: 'Wedge', carry: 100, total: 105 },
      { id: 'w46', name: '46°', type: 'Wedge', carry: 60, total: 65 },
    ], 62);
    expect(r.primary.name).toBe('PW');
    expect(r.longer).toBeNull();
  });

  it('allowedClubs 로 고를 수 있는 종류를 제한한다', () => {
    const r = recommendClubs(bag, 137, ['wedge']);
    expect(r.primary.name).toBe('52°');
  });

  it('무작위 마이백·거리에서도 불변식이 지켜진다 (최적성·정렬·문구)', () => {
    const rng = createRng(42);
    for (let i = 0; i < 1500; i++) {
      const clubs = CATALOG.filter(() => rng.chance(0.5)).map((c) => {
        if (c.type === 'Putter') return { id: c.id, name: c.name, type: c.type };
        const carry = 30 + Math.round(rng.next() * 200);
        const o = { id: c.id, name: c.name, type: c.type, carry, total: carry + Math.round((rng.next() - 0.2) * 20) };
        if (rng.chance(0.2)) o.unset = true;
        return o;
      });
      const d = Math.round(rng.next() * 300) - 5;
      const out = recommendClubs(clubs, d);
      if (out === null) { if (d > 0) expect(bagCoverage(clubs).usable).toBe(0); continue; }
      const p = out.primary;
      expect(p.lo).toBeLessThanOrEqual(p.hi);
      if (out.fit === 'in') { expect(d).toBeGreaterThanOrEqual(p.lo); expect(d).toBeLessThanOrEqual(p.hi); } else expect(out.gap).toBeGreaterThan(0);
      if (out.shorter) expect(out.shorter.mid).toBeLessThanOrEqual(p.mid);
      if (out.longer) expect(out.longer.mid).toBeGreaterThanOrEqual(p.mid);
      expect(fitText(out)).not.toMatch(/NaN|undefined|null/);
    }
  });
});

describe('마이백 등록', () => {
  it('직접 추가 이름으로 종류를 짐작한다', () => {
    expect(guessCategory('3번 우드')).toBe('Wood');
    expect(guessCategory('7번')).toBe('Iron');
    expect(guessCategory('SW')).toBe('Wedge');
    expect(guessCategory('53')).toBe('Wedge');
    expect(guessCategory('아무거나')).toBeNull();
  });

  it('checkNewClub: 빈 이름·긴 이름·중복을 막는다', () => {
    expect(checkNewClub('', 'Iron').reason).toBe('name');
    expect(checkNewClub('가'.repeat(13), 'Iron').reason).toBe('long');
    expect(checkNewClub('7i', 'Iron', [{ name: '7 I', type: 'Iron' }]).reason).toBe('dup');
    expect(checkNewClub('SW', 'Wedge').ok).toBe(true);
  });

  it('toBagClubs: 거리를 확인하지 않은 클럽은 unset 으로 저장한다', () => {
    const entries = CATALOG.filter((c) => ['Driver', '7i', 'Putter'].includes(c.name));
    const bag = toBagClubs(entries, { [entries.find((e) => e.name === '7i').key]: { carry: 140, total: 146, confirmed: true } });
    expect(bag.find((c) => c.name === '7i')).toMatchObject({ carry: 140, total: 146 });
    expect(bag.find((c) => c.name === '7i').unset).toBeUndefined();
    expect(bag.find((c) => c.name === 'Driver').unset).toBe(true);
    expect(bag.find((c) => c.name === 'Putter')).toEqual({ id: 'putter', name: 'Putter', type: 'Putter' });
  });

  it('클럽 간격: 벌어진 곳을 찾되 드라이버와 다음 클럽 사이는 뺀다', () => {
    const g = bagGaps([
      { name: 'Driver', type: 'Wood', total: 215 }, { name: '3W', type: 'Wood', total: 195 },
      { name: '5i', type: 'Iron', total: 160 }, { name: '9i', type: 'Iron', total: 120 },
    ]);
    expect(g.wide.map((w) => `${w.longer}-${w.shorter}`)).toEqual(['5i-9i', '3W-5i']);
    expect(gapReport([{ name: '7i', type: 'Iron', total: 140 }], true).speak).toBe(false);
  });
});
