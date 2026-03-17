import { getTodayStartUTC8 } from '../utils/date';

describe('getTodayStartUTC8', () => {
  it('returns a Date object', () => {
    expect(getTodayStartUTC8()).toBeInstanceOf(Date);
  });

  it('returns a time in the past (start of today)', () => {
    const start = getTodayStartUTC8();
    expect(start.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('returns start of day in UTC+8 (midnight UTC+8 = 16:00 UTC previous day)', () => {
    const start = getTodayStartUTC8();
    // When converted to UTC+8, hours should be 0
    const utc8Hours = new Date(start.getTime() + 8 * 60 * 60 * 1000).getUTCHours();
    const utc8Minutes = new Date(start.getTime() + 8 * 60 * 60 * 1000).getUTCMinutes();
    const utc8Seconds = new Date(start.getTime() + 8 * 60 * 60 * 1000).getUTCSeconds();
    expect(utc8Hours).toBe(0);
    expect(utc8Minutes).toBe(0);
    expect(utc8Seconds).toBe(0);
  });

  it('is within the last 24 hours', () => {
    const start = getTodayStartUTC8();
    const diff = Date.now() - start.getTime();
    expect(diff).toBeGreaterThanOrEqual(0);
    expect(diff).toBeLessThan(24 * 60 * 60 * 1000);
  });

  it('returns the same value when called twice in quick succession', () => {
    const a = getTodayStartUTC8();
    const b = getTodayStartUTC8();
    expect(a.getTime()).toBe(b.getTime());
  });
});
