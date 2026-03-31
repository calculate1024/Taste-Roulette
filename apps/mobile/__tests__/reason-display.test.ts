// Test: reason display logic — correct language shown based on locale

describe('Reason display logic', () => {
  const card = {
    reason: 'NPR Music 推薦 — 越聽越上癮的節奏',
    reasonEn: 'NPR Music pick — rhythm that gets under your skin',
  };

  const cardNoEn = {
    reason: '推',
    reasonEn: null,
  };

  function getDisplayReason(
    reason: string | null,
    reasonEn: string | null,
    language: string,
  ): string {
    if (language === 'en' && reasonEn) return reasonEn;
    return reason || '';
  }

  it('shows zh-TW reason for Chinese users', () => {
    expect(getDisplayReason(card.reason, card.reasonEn, 'zh-TW')).toBe(
      'NPR Music 推薦 — 越聽越上癮的節奏',
    );
  });

  it('shows English reason for English users when available', () => {
    expect(getDisplayReason(card.reason, card.reasonEn, 'en')).toBe(
      'NPR Music pick — rhythm that gets under your skin',
    );
  });

  it('falls back to zh-TW when English reason is null', () => {
    expect(getDisplayReason(cardNoEn.reason, cardNoEn.reasonEn, 'en')).toBe(
      '推',
    );
  });

  it('returns empty string when both are null', () => {
    expect(getDisplayReason(null, null, 'en')).toBe('');
  });
});
