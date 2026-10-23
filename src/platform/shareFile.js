// 파일을 기기 밖으로 내보내는 방법 두 가지 — 공유 시트(지원하는 기기) · 다운로드.
// 백업 파일과 리포트 이미지가 같이 쓴다.

// 이 파일을 공유 시트로 보낼 수 있는지 (iOS·Android 의 홈 화면 앱 · 모바일 브라우저 대부분)
export function canShareFile(file) {
  try {
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
      && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

export const makeFile = (blob, fileName) => new File([blob], fileName, { type: blob.type || 'application/octet-stream' });

// 'shared' 공유 시트로 보냄 · 'cancelled' 사용자가 닫음 · 'unsupported' 이 기기에서는 쓸 수 없음 (다운로드로 대신한다)
export async function shareFile(blob, fileName, { title, text } = {}) {
  const file = makeFile(blob, fileName);
  if (!canShareFile(file)) return 'unsupported';
  try {
    await navigator.share({ files: [file], title, text });
    return 'shared';
  } catch (e) {
    if (e?.name === 'AbortError') return 'cancelled';
    return 'unsupported';
  }
}

// 브라우저 다운로드 (파일 앱·다운로드 폴더로 저장된다)
export function downloadFile(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// 공유를 우선하고, 안 되면 다운로드. 반환: 'shared' | 'downloaded' | 'cancelled'
export async function shareOrDownload(blob, fileName, options) {
  const r = await shareFile(blob, fileName, options);
  if (r === 'shared') return 'shared';
  if (r === 'cancelled') return 'cancelled';
  downloadFile(blob, fileName);
  return 'downloaded';
}
