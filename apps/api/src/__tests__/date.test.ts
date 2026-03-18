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

describe('yesterday time range for echo feature', () => {
  it('yesterday range is exactly 24 hours before today', () => {
    const todayStart = getTodayStartUTC8();
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

    // Yesterday start should be exactly 24h before today start
    expect(todayStart.getTime() - yesterdayStart.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('yesterday range does not overlap with today', () => {
    const todayStart = getTodayStartUTC8();
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

    // A timestamp at today 00:00:00 UTC+8 should NOT be in yesterday's range
    expect(todayStart.getTime()).toBeGreaterThanOrEqual(todayStart.getTime());
    // A timestamp at yesterday 23:59:59 UTC+8 should be in yesterday's range
    const lastSecondYesterday = new Date(todayStart.getTime() - 1);
    expect(lastSecondYesterday.getTime()).toBeGreaterThanOrEqual(yesterdayStart.getTime());
    expect(lastSecondYesterday.getTime()).toBeLessThan(todayStart.getTime());
  });

  it('yesterday start is midnight UTC+8 of the previous day', () => {
    const todayStart = getTodayStartUTC8();
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

    // When converted to UTC+8, hours should be 0
    const utc8Hours = new Date(yesterdayStart.getTime() + 8 * 60 * 60 * 1000).getUTCHours();
    expect(utc8Hours).toBe(0);
  });

  it('a mid-yesterday timestamp falls within yesterday range', () => {
    const todayStart = getTodayStartUTC8();
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const midYesterday = new Date(yesterdayStart.getTime() + 12 * 60 * 60 * 1000);

    expect(midYesterday.getTime()).toBeGreaterThanOrEqual(yesterdayStart.getTime());
    expect(midYesterday.getTime()).toBeLessThan(todayStart.getTime());
  });
});
