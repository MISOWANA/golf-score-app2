import { useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import styles from '../../styles/styles';
import { buildStatsReport } from '../../engine/statsReport.js';
import StickyTabs from '../ui/StickyTabs';
import OverviewTab from './OverviewTab';
import TeeTab from './TeeTab';
import ApproachTab from './ApproachTab';
import PuttingTab from './PuttingTab';
import ClubTab from './ClubTab';

// 스탯 — 쌓인 라운드로 보는 '내 평소 모습'. 종합 · 티샷 · 어프로치 · 퍼팅 · 클럽
const TABS = [['overview', '종합'], ['tee', '티샷'], ['approach', '어프로치'], ['putting', '퍼팅'], ['club', '클럽']];

const ExcludedNote = ({ count }) => count > 0 && (
  <div style={{ margin: '0 0 12px', padding: '9px 12px', borderRadius: 12, background: 'rgba(136,150,176,0.08)', border: '1px solid #1b2238', fontSize: 12, color: '#8896b0', lineHeight: 1.6, textAlign: 'left' }}>
    여러 명이 함께 기록한 라운드 {count}개는 집계에서 제외돼요 (1인 라운드만 분석)
  </div>
);

export default function StatsView({ rounds, onBack, excludedCount = 0 }) {
  const [tab, setTab] = useState('overview');
  const report = useMemo(() => (rounds.length > 0 ? buildStatsReport(rounds) : null), [rounds]);

  const header = (
    <header style={styles.pageHeader}>
      <button style={styles.iconBack} onClick={onBack}>
        <ChevronLeft size={22} />
      </button>
      <div style={styles.pageTitle}>Stats</div>
      <div style={{ width: 40 }} />
    </header>
  );

  if (!report) {
    return (
      <div style={styles.container}>
        {header}
        <ExcludedNote count={excludedCount} />
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📊</div>
          <div style={styles.emptyTitle}>통계 데이터 부족</div>
          <div style={styles.emptySub}>라운드를 기록하면 통계가 쌓입니다</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} data-role="stats-view">
      {header}
      <ExcludedNote count={excludedCount} />
      <StickyTabs tabs={TABS} current={tab} onChange={setTab} label="스탯 영역" rolePrefix="stats-tab" />
      {tab === 'overview' && <OverviewTab report={report} onGo={setTab} />}
      {tab === 'tee' && <TeeTab report={report} />}
      {tab === 'approach' && <ApproachTab report={report} />}
      {tab === 'putting' && <PuttingTab report={report} />}
      {tab === 'club' && <ClubTab report={report} />}
      {tab !== 'overview' && (
        <div data-role="badge-legend" style={{ fontSize: 10.5, color: '#6e84a8', lineHeight: 1.6, textAlign: 'center', padding: '2px 12px 0', wordBreak: 'keep-all' }}>
          높음·중간·낮음은 그 숫자를 얼마나 믿어도 되는지예요. 기록이 쌓일수록 올라가요.
        </div>
      )}
    </div>
  );
}
