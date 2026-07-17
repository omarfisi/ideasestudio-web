/**
 * calendarGrid.js
 *
 * Pure date-grid helpers shared by every calendar UI in the booking flow —
 * ServiceBookingCheckoutPanel.jsx (new bookings during checkout) and
 * AccountOrderReschedulePage.jsx (picking a new date for an existing order
 * whose hold expired). No React, no API calls.
 */

export function toYMD(date) {
  return date.toISOString().slice(0, 10);
}

export function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  d.setDate(1);
  return d;
}

/** Mon-first calendar grid for a given year/month: null for the leading
 * blank cells, then one Date per day of the month. */
export function buildCalendarGrid(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDow = (first.getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
  return cells;
}
