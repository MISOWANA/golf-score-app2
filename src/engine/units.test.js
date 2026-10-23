import { describe, it, expect, afterEach } from 'vitest';
import {
  localizeDeep, getUnit, setUnit, isYards, unitLabel, toDisplay, fromDisplay, fmtShot, fmtPutt, fmtShotRange, localizeText, tx, UNIT_IDS,
} from './units.js';

afterEach(() => setUnit('m'));

describe('현재 단위', () => {
  it('기본은 미터이고, 알 수 없는 값은 무시한다', () => {
    expect(getUnit()).toBe('m');
    setUnit('furlong');
    expect(getUnit()).toBe('m');
    setUnit('yd');
    expect(getUnit()).toBe('yd');
    expect(isYards()).toBe(true);
    expect(UNIT_IDS).toEqual(['m', 'yd']);
  });

  it('야드에서는 샷은 yd, 퍼트는 ft', () => {
    setUnit('yd');
    expect([unitLabel('shot'), unitLabel('putt')]).toEqual(['yd', 'ft']);
    setUnit('m');
    expect([unitLabel('shot'), unitLabel('putt')]).toEqual(['m', 'm']);
  });
});

describe('변환', () => {
  it('미터 → 야드 · 피트', () => {
    expect(toDisplay(100, 'shot', 'yd')).toBeCloseTo(109.36, 1);
    expect(toDisplay(3.048, 'putt', 'yd')).toBeCloseTo(10, 2);
    expect(toDisplay(100, 'shot', 'm')).toBe(100);
    expect(toDisplay(null, 'shot', 'yd')).toBeNull();
  });

  it('야드로 받은 값은 소수 첫째 자리 미터로 저장해 다시 보여 줘도 같은 야드가 나온다 (20~380야드 전부)', () => {
    for (let yd = 20; yd <= 380; yd++) {
      const m = fromDisplay(yd, 'shot', 'yd');
      expect(Math.round(toDisplay(m, 'shot', 'yd'))).toBe(yd);
    }
  });

  it('피트로 받은 퍼트도 다시 보여 줘도 같은 피트가 나온다 (1~120피트)', () => {
    for (let ft = 1; ft <= 120; ft++) {
      const m = fromDisplay(ft, 'putt', 'yd');
      expect(Math.round(toDisplay(m, 'putt', 'yd'))).toBe(ft);
    }
  });

  it('미터로 받은 값은 그대로 저장한다', () => {
    expect(fromDisplay(137, 'shot', 'm')).toBe(137);
    expect(fromDisplay(null, 'shot', 'yd')).toBeNull();
  });
});

describe('fmtShot · fmtPutt', () => {
  it('미터: 샷은 정수, 퍼트는 정수면 정수·아니면 소수 한 자리', () => {
    expect(fmtShot(137)).toBe('137m');
    expect(fmtShot(137.2)).toBe('137m');
    expect(fmtShot(137.2, { digits: 1 })).toBe('137.2m');
    expect(fmtPutt(3.5)).toBe('3.5m');
    expect(fmtPutt(5)).toBe('5m');
  });

  it('야드 · 피트는 정수', () => {
    setUnit('yd');
    expect(fmtShot(137.2)).toBe('150yd');
    expect(fmtShot(100)).toBe('109yd');
    expect(fmtPutt(3.048)).toBe('10ft');
    expect(fmtPutt(0.5)).toBe('2ft');
  });

  it('단위 없이 숫자만, 값이 없으면 대체 글자', () => {
    setUnit('yd');
    expect(fmtShot(100, { unit: false })).toBe('109');
    expect(fmtShot(null)).toBe('–');
    expect(fmtShot(undefined, { fallback: '—' })).toBe('—');
    expect(fmtPutt(NaN)).toBe('–');
  });

  it('digits 를 주면 미터에서 그 자리까지 (근접도 6.4m 처럼)', () => {
    expect(fmtPutt(6.43, { digits: 1 })).toBe('6.4m');
    expect(fmtPutt(6, { digits: 1 })).toBe('6.0m');
    setUnit('yd');
    expect(fmtPutt(6.43, { digits: 1 })).toBe('21ft');
  });

  it('id 를 직접 줄 수 있다 (현재 단위와 무관)', () => {
    expect(fmtShot(100, { id: 'yd' })).toBe('109yd');
    setUnit('yd');
    expect(fmtShot(100, { id: 'm' })).toBe('100m');
  });

  it('범위: 양 끝이 같아지면 하나로', () => {
    expect(fmtShotRange(110, 140)).toBe('110–140m');
    expect(fmtShotRange(150, 150)).toBe('150m');
    setUnit('yd');
    expect(fmtShotRange(110, 140)).toBe('120–153yd');
  });
});

describe('localizeText — 문장 속 미터', () => {
  const yd = (t) => localizeText(t, 'yd');

  it('미터 단위면 그대로 둔다', () => {
    expect(localizeText('1.5m 이내 퍼트', 'm')).toBe('1.5m 이내 퍼트');
    expect(tx('110-140m 구간')).toBe('110-140m 구간');
  });

  it('퍼트 이야기의 거리는 피트로', () => {
    expect(yd('롱 퍼트는 홀보다 1m 원 안에 세우고, 1.5m 이내 퍼트는 루틴을 지켜 마무리하세요.')).toBe('롱 퍼트는 홀보다 3피트 원 안에 세우고, 5피트 이내 퍼트는 루틴을 지켜 마무리하세요.');
    expect(yd('6m 이상 롱 퍼트는 1m 원 안에 세우는 드릴(10·15·20m 각 5개)을 연습하세요.')).toBe('20피트 이상 롱 퍼트는 3피트 원 안에 세우는 드릴(33·49·66피트 각 5개)을 연습하세요.');
  });

  it('샷 이야기의 큰 거리는 야드로, 범위도 양 끝 모두', () => {
    expect(yd('110-140m 구간 근접도 중앙값')).toBe('120-153야드 구간 근접도 중앙값');
    expect(yd('80m 안 샷은 숏게임')).toBe('87야드 안 샷은 숏게임');
    expect(yd('드라이버로 20~30m를 줄이는')).toBe('드라이버로 22~33야드를 줄이는');
  });

  it('샷 단어가 섞이면 숫자마다 크기로 가른다 (12m 이하는 피트)', () => {
    expect(yd('그린 주변에서는 첫 퍼트(또는 칩샷)를 2m 안에 남기는 것이 목표')).toBe('그린 주변에서는 첫 퍼트(또는 칩샷)를 7피트 안에 남기는 것이 목표');
  });

  it('"~80m" · "170m+" 같은 꼴, 소수', () => {
    expect(yd('~80m')).toBe('~87야드');
    expect(yd('170m+')).toBe('186야드+');
    expect(yd('1-2m')).toBe('3-7피트');
    expect(yd('0.6m 원')).toBe('2피트 원');
  });

  it('야드·피트로 쓴 값에 붙은 미터 풀이는 중복이라 뺀다', () => {
    expect(yd('100야드(약 91m) 밖 샷')).toBe('100야드 밖 샷');
    expect(yd('60피트(18m)에서 2퍼트는 잘한 것')).toBe('60피트에서 2퍼트는 잘한 것');
    expect(yd('10피트(약 3m) 퍼팅 게임')).toBe('10피트 퍼팅 게임');
    expect(yd('114m(125야드)에서 여러 번 쳐서')).toBe('125야드에서 여러 번 쳐서');
    expect(yd('<b>1~2m(3~7피트)</b> 구간')).toBe('<b>3~7피트</b> 구간');
    expect(yd('드라이버를 18m(20야드) 더 보내면')).toBe('드라이버를 20야드 더 보내면');
    expect(yd('투어 프로 16피트(약 4.9m) · 평균 90타 골퍼 37피트(약 11.3m)')).toBe('투어 프로 16피트 · 평균 90타 골퍼 37피트');
  });

  it('근접도 문장은 20m 넘는 값도 피트로 (핀까지 남은 거리)', () => {
    expect(yd('110-140m 구간 근접도 중앙값 7.9m')).toBe('120-153야드 구간 근접도 중앙값 26피트');
    expect(yd('125야드 근접도: 투어 6.4m · 90타 골퍼 13.7m')).toBe('125야드 근접도: 투어 21피트 · 90타 골퍼 45피트');
  });

  it('m/s · cm · 단어 속 m 은 건드리지 않는다', () => {
    expect(yd('바람 3.5m/s')).toBe('바람 3.5m/s');
    expect(yd('홀 뒤 60cm 안으로')).toBe('홀 뒤 60cm 안으로');
    expect(yd('Driver 3W')).toBe('Driver 3W');
  });

  it('문자열이 아니면 그대로', () => {
    expect(yd(null)).toBeNull();
    expect(yd(12)).toBe(12);
  });

  it('tx 는 현재 단위로 바꾼다', () => {
    setUnit('yd');
    expect(tx('2m 이내 퍼트')).toBe('7피트 이내 퍼트');
  });
});

describe('localizeDeep — 분석 결과 통째로', () => {
  it('미터면 같은 객체를 그대로 돌려준다', () => {
    const o = { a: '2m 이내', b: [1, '3m'] };
    expect(localizeDeep(o, 'm')).toBe(o);
  });

  it('문자열만 바꾸고 숫자 · 구조 · 날짜는 그대로', () => {
    const when = new Date(2026, 0, 2);
    const o = { text: '2m 이내 퍼트', list: [{ t: '110-140m 구간' }, 7, null], n: 3, when, nested: { deep: { s: '80m 안 샷은 숏게임' } } };
    const out = localizeDeep(o, 'yd');
    expect(out).toEqual({ text: '7피트 이내 퍼트', list: [{ t: '120-153야드 구간' }, 7, null], n: 3, when, nested: { deep: { s: '87야드 안 샷은 숏게임' } } });
    expect(out.when).toBe(when);
    expect(o.text).toBe('2m 이내 퍼트');   // 원본은 바뀌지 않는다
  });

  it('현재 단위를 따른다', () => {
    setUnit('yd');
    expect(localizeDeep({ s: '1m 원' })).toEqual({ s: '3피트 원' });
  });
});

describe('localizeText — 짧은 이름표(abbr)', () => {
  it('좁은 칸에는 야드·피트 대신 yd · ft', () => {
    expect(localizeText('110-140m', 'yd', { abbr: true })).toBe('120-153yd');
    expect(localizeText('~80m', 'yd', { abbr: true })).toBe('~87yd');
    expect(localizeText('1-2m', 'yd', { abbr: true })).toBe('3-7ft');
    expect(localizeText('5m+', 'yd', { abbr: true })).toBe('16ft+');
    expect(localizeText('110-140m', 'yd')).toBe('120-153야드');
  });
});
