import React from 'react';
import { Home, BookOpen, BarChart3, Zap, Briefcase } from 'lucide-react';
import styles from '../../styles/styles';

export default function BottomTabBar({ current, onChange }) {
  const tabs = [
    { id: 'history', label: '히스토리', icon: BookOpen },
    { id: 'stats', label: '스탯', icon: BarChart3 },
    { id: 'home', label: '홈', icon: Home },
    { id: 'insights', label: '인사이트', icon: Zap },
    { id: 'mybag', label: 'MY BAG', icon: Briefcase },
  ];

  return (
    <div style={styles.tabBar}>
      <div style={styles.tabBarInner}>
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = current === id;
          const isHome = id === 'home';
          return (
            <button
              key={id}
              style={{
                ...styles.tabBarBtn,
                ...(isHome ? styles.tabBarBtnHome : {}),
                color: isActive ? '#c9a228' : '#4d5a78',
              }}
              onClick={() => onChange(id)}
              title={label}
            >
              <Icon size={isHome ? 24 : 20} strokeWidth={isActive ? 2.5 : 1.8} />
              {!isHome && (
                <span style={{
                  ...styles.tabBarLabel,
                  fontWeight: isActive ? '700' : '500',
                }}>
                  {label}
                </span>
              )}
              {isActive && <div style={styles.tabBarActiveIndicator} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
