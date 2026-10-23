// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { canShareFile, shareFile, shareOrDownload, downloadFile } from './shareFile.js';

const blob = new Blob(['{}'], { type: 'application/json' });

afterEach(() => {
  delete navigator.share;
  delete navigator.canShare;
  vi.restoreAllMocks();
});

describe('shareFile', () => {
  it('공유 API 가 없으면 unsupported', async () => {
    expect(canShareFile(new File(['x'], 'a.json'))).toBe(false);
    expect(await shareFile(blob, 'a.json')).toBe('unsupported');
  });

  it('canShare 가 거절하면 unsupported', async () => {
    navigator.share = vi.fn();
    navigator.canShare = vi.fn(() => false);
    expect(await shareFile(blob, 'a.json')).toBe('unsupported');
    expect(navigator.share).not.toHaveBeenCalled();
  });

  it('공유 시트로 파일을 보낸다', async () => {
    navigator.share = vi.fn().mockResolvedValue(undefined);
    navigator.canShare = vi.fn(() => true);
    expect(await shareFile(blob, 'a.json', { title: '백업' })).toBe('shared');
    const arg = navigator.share.mock.calls[0][0];
    expect(arg.files[0]).toBeInstanceOf(File);
    expect(arg.files[0].name).toBe('a.json');
    expect(arg.title).toBe('백업');
  });

  it('사용자가 공유 창을 닫으면 cancelled', async () => {
    navigator.share = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' }));
    navigator.canShare = vi.fn(() => true);
    expect(await shareFile(blob, 'a.json')).toBe('cancelled');
  });

  it('공유가 다른 이유로 실패하면 unsupported (다운로드로 대신할 수 있게)', async () => {
    navigator.share = vi.fn().mockRejectedValue(new Error('boom'));
    navigator.canShare = vi.fn(() => true);
    expect(await shareFile(blob, 'a.json')).toBe('unsupported');
  });
});

describe('shareOrDownload', () => {
  const stubDownload = () => {
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    return vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  };

  it('공유가 되면 다운로드하지 않는다', async () => {
    const click = stubDownload();
    navigator.share = vi.fn().mockResolvedValue(undefined);
    navigator.canShare = vi.fn(() => true);
    expect(await shareOrDownload(blob, 'a.json')).toBe('shared');
    expect(click).not.toHaveBeenCalled();
  });

  it('공유할 수 없으면 다운로드한다', async () => {
    const click = stubDownload();
    expect(await shareOrDownload(blob, 'a.json')).toBe('downloaded');
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('사용자가 닫으면 아무것도 하지 않는다', async () => {
    const click = stubDownload();
    navigator.share = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' }));
    navigator.canShare = vi.fn(() => true);
    expect(await shareOrDownload(blob, 'a.json')).toBe('cancelled');
    expect(click).not.toHaveBeenCalled();
  });

  it('downloadFile: 파일 이름을 달아 링크를 눌렀다 지운다', () => {
    stubDownload();
    downloadFile(blob, 'backup.json');
    expect(document.querySelector('a[download]')).toBeNull();
  });
});
