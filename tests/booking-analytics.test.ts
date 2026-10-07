import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyticsCsv, csvCell, shiftMonth, summarizeBookings, variation } from '../src/lib/bookingAnalytics';
const rows = [
  { id: '1', service_id: 'a', service_name: 'Gel', date: '2026-10-05', time: '09:00', price: '100.50' },
  { id: '2', service_id: 'a', service_name: 'Gel atualizado', date: '2026-10-06', time: '10:00', price: 150 },
  { id: '3', service_id: 'b', service_name: 'Manicure', date: '2026-10-12', time: '09:00', price: 50 },
  { id: '4', service_id: 'a', service_name: 'Gel', date: '2026-09-30', time: '09:00', price: 80 },
];
test('period boundaries, historical prices and services grouped by ID', () => {
  const summary = summarizeBookings(rows, '2026-10');
  assert.equal(summary.count, 3);
  assert.equal(summary.value, 300.5);
  assert.equal(summary.ticket, 300.5 / 3);
  assert.equal(summary.activeDays, 3);
  assert.equal(summary.services.length, 2);
  assert.equal(summary.services[0].count, 2);
  assert.equal(summary.services[0].label, 'Gel atualizado');
  assert.equal(summary.services[0].value, 250.5);
  assert.equal(summary.weekdays[1].count, 2);
  assert.equal(summary.weekdays[1].occurrences, 4);
  assert.equal(summary.weekdays[1].average, 0.5);
  assert.deepEqual(summary.hours, [{ label: '09:00', count: 2 }, { label: '10:00', count: 1 }]);
  assert.equal(summary.daily.length, 31);
  assert.equal(summary.daily.reduce((n, d) => n + d.count, 0), summary.count);
  assert.equal(summarizeBookings(rows, '2026-09').value, 80);
});
test('empty periods, leap years, zero comparison and year boundaries', () => {
  const empty = summarizeBookings([], '2028-02');
  assert.equal(empty.daily.length, 29);
  assert.equal(empty.ticket, 0);
  assert.equal(empty.activeDays, 0);
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(variation(1, 0), 'Sem base no mês anterior');
  assert.equal(variation(0, 0), 'Sem variação');
  assert.equal(variation(0, 10), '-100% vs. mês anterior');
  assert.equal(variation(15, 10), '+50% vs. mês anterior');
});
test('CSV preserves Portuguese values and neutralizes formula injection', () => {
  assert.equal(csvCell(' =HYPERLINK("x")'), '"\' =HYPERLINK(""x"")"');
  assert.equal(csvCell('Gel; "premium"'), '"Gel; ""premium"""');
  const csv = analyticsCsv(summarizeBookings(rows, '2026-10'), summarizeBookings(rows, '2026-09'), '2026-10');
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"300,50"'));
  assert.ok(csv.includes('"2026-10-31";"0";"0,00"'));
  assert.ok(csv.includes('"Gel atualizado";"2";"66,67";"250,50"'));
  assert.ok(!csv.includes('client_phone'));
});
