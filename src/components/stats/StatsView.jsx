import { useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import styles from '../../styles/styles';
import { buildStatsReport } from '../../engine/statsReport.js';
import StickyTabs from '../ui/StickyTabs';
import OverviewTab from './OverviewTab';
import TeeTab from './TeeTab';
import ApproachTab from './ApproachTab';
import ShortGameTab from './ShortGameTab';
import PuttingTab from './PuttingTab';
import ClubTab from './ClubTab';
import ExcludedNote from './ExcludedNote';
import EmptyGuide from '../common/EmptyGuide';

// 스탯 — 쌓인 라운드로 보는 '내 평소 모습'. 종합 · 티샷 · 어프로치 · 숏게임 · 퍼팅 · 클럽
const TABS = [['overview', '종합'], ['tee', '티샷'], ['approach', '어프로치'], ['short', '숏게임'], ['putting', '퍼팅'], ['club', '클럽']];

export default function StatsView({ rounds, onBack, excludedCount = 0, nineExcludedCount = 0, onStartRound }) {
  const [tab, setTab] = useState('overview');
  const report = useMemo(() => (rounds.length > 0 ? buildStatsReport(rounds) : null), [rounds]);

  const header = (
    <header style={styles.pageHeader}>
      <button style={styles.iconBack} onClick={onBack} aria-label="뒤로">
        <ChevronLeft size={22} />
      </button>
      <div style={styles.pageTitle}>Stats</div>
      <div style={{ width: 44 }} />
    </header>
  );

  if (!report) {
    return (
      <div style={styles.container}>
        {header}
        <ExcludedNote multiCount={excludedCount} nineCount={nineExcludedCount} />
        <EmptyGuide role="stats-empty" icon="📊" title="아직 통계가 없어요" onStart={onStartRound}
          lead={<>1명이 18홀을 끝낸 라운드가 쌓이면<br />티샷 · 어프로치 · 퍼팅 통계가 채워져요</>} />
      </div>
    );
  }

  return (
    <div style={styles.container} data-role="stats-view">
      {header}
      <ExcludedNote multiCount={excludedCount} nineCount={nineExcludedCount} />
      <StickyTabs variant="underline" dense tabs={TABS} current={tab} onChange={setTab} label="스탯 영역" rolePrefix="stats-tab" />
      {tab === 'overview' && <OverviewTab report={report} onGo={setTab} />}
      {tab === 'tee' && <TeeTab report={report} />}
      {tab === 'approach' && <ApproachTab report={report} />}
      {tab === 'short' && <ShortGameTab report={report} />}
      {tab === 'putting' && <PuttingTab report={report} />}
      {tab === 'club' && <ClubTab report={report} />}
      {tab !== 'overview' && (
        <div data-role="badge-legend" style={{ fontSize: 12, color: '#8aa0c4', lineHeight: 1.6, textAlign: 'center', padding: '2px 12px 0', wordBreak: 'keep-all' }}>
          높음·중간·낮음은 그 숫자를 얼마나 믿어도 되는지예요. 기록이 쌓일수록 올라가요.
        </div>
      )}
    </div>
  );
}
