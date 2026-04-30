import React from 'react';
import styles from '../../styles/styles';

export default function Insights({ stats, round, player }) {
  const insights = [];

  if (stats.girPct >= 50) {
    insights.push({ icon: '🎯', text: `GIR ${stats.girPct}% — 아이언 샷이 견고했습니다.` });
  } else if (stats.girPct < 30) {
    insights.push({ icon: '⚠️', text: `GIR ${stats.girPct}% — 아이언/어프로치 정확도 개선 여지.` });
  }

  if (stats.avgPutts <= 1.8) {
    insights.push({ icon: '⛳', text: `홀당 평균 ${stats.avgPutts}퍼팅 — 훌륭한 그린 감각.` });
  } else if (stats.avgPutts >= 2.2) {
    insights.push({ icon: '📉', text: `퍼팅당 평균 ${stats.avgPutts} — 퍼팅 연습이 스코어에 큰 영향.` });
  }

  if (stats.fairwayPct >= 60) {
    insights.push({ icon: '🏹', text: `페어웨이 안착 ${stats.fairwayPct}% — 티샷이 안정적.` });
  } else if (stats.fairwayPct < 40) {
    insights.push({ icon: '🌲', text: `페어웨이 ${stats.fairwayPct}% — 티샷 정확도가 스코어 관리의 열쇠.` });
  }

  const front = stats.front9;
  const back = stats.back9;
  if (Math.abs(front - back) >= 4) {
    insights.push({
      icon: front > back ? '📈' : '📉',
      text: front > back
        ? `후반 9홀(${back})이 전반(${front})보다 ${front - back}타 좋았습니다 — 페이스 잘 유지.`
        : `전반 9홀(${front})이 후반(${back})보다 ${back - front}타 좋았습니다 — 후반 집중력 관리 필요.`
    });
  }

  if (stats.doubles >= 4) {
    insights.push({ icon: '🚨', text: `더블보기 이상 ${stats.doubles}회 — 큰 실수 줄이면 스코어 크게 개선.` });
  }

  if (stats.birdies + stats.eagles >= 3) {
    insights.push({ icon: '🔥', text: `버디 이상 ${stats.birdies + stats.eagles}회 — 찬스에서 잘 마무리했습니다.` });
  }

  if (insights.length === 0) {
    insights.push({ icon: '✨', text: '균형 잡힌 라운드였습니다.' });
  }

  return (
    <div style={styles.insightsList}>
      {insights.map((ins, i) => (
        <div key={i} style={styles.insightRow}>
          <div style={styles.insightIcon}>{ins.icon}</div>
          <div style={styles.insightText}>{ins.text}</div>
        </div>
      ))}
    </div>
  );
}
