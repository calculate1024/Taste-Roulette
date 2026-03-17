/**
 * Get the start of "today" in UTC+8, returned as a UTC Date for DB queries.
 * All date boundaries in this app use UTC+8 (Asia/Taipei) consistently.
 */
export function getTodayStartUTC8(): Date {
  const now = new Date();
  // Convert to UTC+8
  const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  utc8.setUTCHours(0, 0, 0, 0);
  // Convert back to UTC for DB queries
  return new Date(utc8.getTime() - 8 * 60 * 60 * 1000);
}
