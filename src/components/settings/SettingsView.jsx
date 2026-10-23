import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Download, Share2, Upload, RefreshCw } from 'lucide-react';
import styles from '../../styles/styles';
import KoEnTitle from '../ui/KoEnTitle';
import InfoNote from '../ui/InfoNote';
import { Card } from '../stats/widgets.jsx';
import { backupStatus, backupMessage } from '../../engine/backupStatus.js';
import { canShareFile } from '../../platform/shareFile.js';
import { hardRefresh } from '../../platform/hardRefresh.js';

// 설정 — 데이터는 이 기기에만 있으므로 백업과 기기 옮기기가 가장 중요한 설정이다.
//   onBackup({ share })  백업 파일을 만든다 → { status: 'downloaded' | 'shared' | 'cancelled', fileName }
//   onImport(file)       백업 파일에서 복원한다 (App 이 결과 안내를 띄운다)
const TONE = { none: '#ef5350', stale: '#c9a228', ok: '#3db87a', empty: '#8896b0' };

const btn = (kind) => ({
  flex: '1 1 140px', minWidth: 0, padding: '13px 10px', borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, textAlign: 'center', wordBreak: 'keep-all',
  ...(kind === 'primary'
    ? { background: '#c9a228', color: '#0b0e18', border: '1.5px solid transparent' }
    : kind === 'green'
      ? { background: 'rgba(61,184,122,0.12)', color: '#3db87a', border: '1.5px solid rgba(61,184,122,0.5)' }
      : { background: 'transparent', color: '#e8edf8', border: '1.5px solid #2c3a5c' }),
});

// 저장소 보호 상태 — 브라우저가 저장 공간이 부족할 때 이 앱의 기록을 지우지 않도록 요청한 결과와 사용량
async function readStorageState() {
  try {
    const persisted = (await navigator.storage?.persisted?.()) ?? null;
    const est = await navigator.storage?.estimate?.();
    return { checked: true, persisted, usage: est?.usage ?? null, quota: est?.quota ?? null };
  } catch {
    return { checked: true, persisted: null };
  }
}

const STEPS = [
  ['지금 쓰던 기기에서', '위의 [백업 파일 저장] 또는 [공유로 보내기]로 파일을 만들어요. 카카오톡 "나에게 보내기", 구글 드라이브, 이메일, AirDrop 어디로 보내도 괜찮아요.'],
  ['새 기기에서', '이 앱을 같은 주소로 열고, 이름을 입력해 시작해요. 이름이 달라도 복원은 돼요 — 복원한 기록은 지금 로그인한 이름의 기록이 돼요.'],
  ['복원하기', '새 기기의 설정에서 [백업에서 복원]을 눌러 받은 파일을 선택해요. 기존 기록은 지우지 않고 합쳐져요.'],
  ['확인하기', '홈의 누적 라운드 수와 히스토리의 최근 라운드가 맞는지 확인해요.'],
];

export default function SettingsView({ currentUser, rounds, backupMeta, onBackup, onImport, onBack }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);                  // { tone: 'ok' | 'error', text }
  const [storage, setStorage] = useState({ checked: false });
  const roundCount = rounds.length;
  const status = backupStatus(backupMeta, roundCount);
  const sampleFile = typeof File === 'function' ? new File(['{}'], 'a.json', { type: 'application/json' }) : null;
  const shareAvailable = !!sampleFile && canShareFile(sampleFile);

  useEffect(() => {
    let alive = true;
    readStorageState().then((next) => { if (alive) setStorage(next); });
    return () => { alive = false; };
  }, []);

  const requestPersist = async () => {
    try { await navigator.storage?.persist?.(); } catch { /* 거절돼도 앱 동작에는 영향이 없다 */ }
    setStorage(await readStorageState());
  };

  const runBackup = async (share) => {
    setBusy(true); setNote(null);
    try {
      const r = await onBackup({ share });
      if (r?.status === 'cancelled') setNote(null);
      else setNote({ tone: 'ok', text: r?.status === 'shared' ? '백업 파일을 공유했어요.' : `백업 파일을 저장했어요. (${r?.fileName})` });
    } catch (e) {
      setNote({ tone: 'error', text: `백업하지 못했어요. ${e?.message || ''}` });
    } finally {
      setBusy(false);
    }
  };

  const mb = (n) => (n == null ? '—' : n >= 1024 * 1024 * 1024 ? `${(n / 1024 / 1024 / 1024).toFixed(1)}GB` : `${(n / 1024 / 1024).toFixed(1)}MB`);

  return (
    <div style={styles.container} data-role="settings-view">
      <header style={styles.pageHeader}>
        <button style={styles.iconBack} onClick={onBack} aria-label="뒤로"><ChevronLeft size={22} /></button>
        <div style={styles.pageTitle}>Settings</div>
        <div style={{ width: 40 }} />
      </header>

      <Card id="backup" title={(
        <KoEnTitle text="BACKUP · 백업 · 기기 옮기기">
          <InfoNote title="백업이 왜 필요한가요?">
            <p>이 앱은 서버가 없어서 기록이 이 기기의 브라우저에만 저장돼요. 기기를 바꾸거나 브라우저 데이터를 지우면 사라질 수 있어서, 백업 파일이 유일한 안전장치예요.</p>
            <p>백업 파일에는 {currentUser.userName}님의 라운드와 마이백이 들어가요. 파일을 다른 기기에서 복원하면 기록을 그대로 옮길 수 있어요.</p>
          </InfoNote>
        </KoEnTitle>
      )}>
        <div data-role="backup-status" data-level={status.level} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
          <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', background: TONE[status.level], marginTop: 7, flexShrink: 0 }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: '#e8edf8', lineHeight: 1.55 }}>{backupMessage(status)}</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button type="button" data-role="backup-download" disabled={busy} style={btn('primary')} onClick={() => runBackup(false)}>
            <Download size={17} />백업 파일 저장
          </button>
          {shareAvailable && (
            <button type="button" data-role="backup-share" disabled={busy} style={btn('secondary')} onClick={() => runBackup(true)}>
              <Share2 size={17} />공유로 보내기
            </button>
          )}
        </div>
        <div style={{ height: 8 }} />
        <button type="button" data-role="backup-restore" disabled={busy} style={{ ...btn('green'), width: '100%', flex: 'none' }} onClick={() => fileRef.current?.click()}>
          <Upload size={17} />백업에서 복원
        </button>
        <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ''; }} />
        <div style={{ fontSize: 14, color: '#8896b0', lineHeight: 1.6, marginTop: 8 }}>
          복원은 기존 기록을 지우지 않고 합쳐요. 같은 라운드는 파일 내용으로 바뀌어요.
        </div>
        {note && (
          <div role="status" data-role="settings-note" style={{ marginTop: 10, fontSize: 14, lineHeight: 1.55, padding: '9px 12px', borderRadius: 10,
            color: note.tone === 'ok' ? '#3db87a' : '#ef5350',
            background: note.tone === 'ok' ? 'rgba(61,184,122,0.08)' : 'rgba(239,83,80,0.08)',
            border: `1px solid ${note.tone === 'ok' ? 'rgba(61,184,122,0.3)' : 'rgba(239,83,80,0.3)'}` }}>{note.text}</div>
        )}
      </Card>

      <Card id="move" title={<KoEnTitle text="MOVE · 기기 옮기기 방법" />}>
        <ol data-role="move-steps" style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {STEPS.map(([head, body], i) => (
            <li key={head} style={{ display: 'flex', gap: 10 }}>
              <span aria-hidden="true" style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(201,162,40,0.16)', color: '#c9a228', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#e8edf8' }}>{head}</div>
                <div style={{ fontSize: 14, color: '#a9b8d6', lineHeight: 1.6, wordBreak: 'keep-all' }}>{body}</div>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card id="storage" title={(
        <KoEnTitle text="STORAGE · 저장 공간">
          <InfoNote title="저장 공간 보호란?">
            <p>"보호"가 켜져 있으면 브라우저가 저장 공간이 부족해도 이 앱의 기록을 함부로 지우지 않아요.</p>
            <p>iOS에서는 홈 화면에 추가하지 않은 사이트의 저장소를 오래 쓰지 않으면 지울 수 있어요. 홈 화면에 추가해서 쓰면 더 안전해요.</p>
          </InfoNote>
        </KoEnTitle>
      )}>
        {!storage.checked ? (
          <div style={{ fontSize: 14, color: '#8896b0' }}>확인하는 중…</div>
        ) : storage.persisted == null ? (
          <div data-role="storage-state" style={{ fontSize: 14, color: '#8896b0', lineHeight: 1.6 }}>이 브라우저에서는 저장 공간 보호 상태를 확인할 수 없어요. 백업을 자주 해 두세요.</div>
        ) : (
          <>
            <div data-role="storage-state" data-persisted={storage.persisted ? '1' : '0'} style={{ fontSize: 15, fontWeight: 700, color: storage.persisted ? '#3db87a' : '#c9a228', lineHeight: 1.55 }}>
              {storage.persisted ? '저장 공간 보호: 켜짐' : '저장 공간 보호: 꺼짐 — 브라우저가 공간이 부족하면 기록을 지울 수 있어요'}
            </div>
            {!storage.persisted && (
              <button type="button" data-role="storage-persist" style={{ ...btn('secondary'), marginTop: 10, width: '100%', flex: 'none' }} onClick={requestPersist}>보호 요청하기</button>
            )}
          </>
        )}
        {storage.usage != null && (
          <div style={{ fontSize: 14, color: '#8896b0', marginTop: 8 }}>이 앱 사용량 {mb(storage.usage)}{storage.quota ? ` / 사용 가능 약 ${mb(storage.quota)}` : ''}</div>
        )}
      </Card>

      <Card id="about" title={<KoEnTitle text="ABOUT · 앱 정보" />}>
        <div style={{ fontSize: 14, color: '#a9b8d6', lineHeight: 1.9 }}>
          <div>사용자 <b style={{ color: '#e8edf8' }}>{currentUser.userName}</b> · 기록 <b style={{ color: '#e8edf8' }}>{roundCount}라운드</b></div>
          <div>버전 <b data-role="app-version" style={{ color: '#e8edf8' }}>{typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '—'}</b></div>
        </div>
        <button type="button" data-role="hard-refresh" style={{ ...btn('secondary'), marginTop: 10, width: '100%', flex: 'none' }} onClick={() => hardRefresh()}>
          <RefreshCw size={16} />최신 버전 다시 받기
        </button>
        <div style={{ fontSize: 13, color: '#6e84a8', lineHeight: 1.6, marginTop: 6 }}>앱이 예전 모습 그대로일 때 눌러 보세요. 기록은 지워지지 않아요.</div>
      </Card>
    </div>
  );
}
