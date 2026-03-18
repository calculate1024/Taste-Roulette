import { getCuratorReason, getCuratorTasteLabel, CURATOR_REASONS } from '../utils/curator-reasons';

describe('getCuratorReason', () => {
  it('returns pre-written reason for known track', () => {
    const reason = getCuratorReason('4u7EnebtmKWzUH433cf5Qv', ['rock']);
    expect(reason).toContain('六分鐘');
  });

  it('returns genre-based fallback for unknown track', () => {
    const reason = getCuratorReason('unknown-id', ['jazz']);
    expect(reason).toContain('爵士迷');
  });

  it('returns generic fallback when no genre match', () => {
    const reason = getCuratorReason('unknown-id', []);
    expect(reason).toBe('有人覺得這首歌值得被更多人聽到');
  });

  it('has a reason for all 30 seed tracks', () => {
    expect(Object.keys(CURATOR_REASONS).length).toBe(30);
  });

  it('no reason is empty', () => {
    for (const [id, reason] of Object.entries(CURATOR_REASONS)) {
      expect(reason.length).toBeGreaterThan(5);
    }
  });
});

describe('getCuratorTasteLabel', () => {
  it('returns label for known genre', () => {
    expect(getCuratorTasteLabel(['rock'])).toBe('搖滾魂');
    expect(getCuratorTasteLabel(['jazz'])).toBe('爵士迷');
    expect(getCuratorTasteLabel(['electronic'])).toBe('電子控');
  });

  it('returns first matching genre label', () => {
    expect(getCuratorTasteLabel(['country', 'pop'])).toBe('鄉村風');
  });

  it('returns fallback for unknown genres', () => {
    expect(getCuratorTasteLabel([])).toBe('音樂探索者');
    expect(getCuratorTasteLabel(['something-unknown'])).toBe('音樂探索者');
  });
});
