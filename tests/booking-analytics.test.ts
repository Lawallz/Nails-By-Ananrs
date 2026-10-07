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

test('status reports retain cancellations and exclude their expected values', async () => {
  const { outstanding, weekDates, phoneKey } = await import('../src/lib/bookingOperations');
  const { summarizeCash } = await import('../src/lib/bookingAnalytics');
  const fixtures = [
    {...rows[0], status:'completed', paid_amount:100.5},
    {...rows[1], status:'cancelled', paid_amount:50},
    {...rows[2], status:'no_show', paid_amount:0},
    {...rows[0], id:'new', status:'confirmed', paid_amount:30},
  ];
  const result=summarizeBookings(fixtures,'2026-10');
  assert.equal(result.total,4); assert.equal(result.count,2); assert.equal(result.completed,1);
  assert.equal(result.cancelled,1); assert.equal(result.noShow,1); assert.equal(result.pending,70.5);
  assert.equal(result.cancellationRate,25); assert.equal(result.value,201);
  assert.equal(outstanding({...rows[1],status:'cancelled'}),0);
  assert.deepEqual(weekDates('2026-11-01'),['2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-10-31','2026-11-01']);
  assert.equal(phoneKey('+55 (11) 99999-9999'),'11999999999');
  const cash=summarizeCash([
    {id:'1',amount:30,kind:'deposit',method:'pix',paid_on:'2026-10-01'},
    {id:'2',amount:70,kind:'payment',method:'credit',paid_on:'2026-10-02'},
    {id:'3',amount:20,kind:'refund',method:'pix',paid_on:'2026-10-03'},
    {id:'4',amount:500,kind:'payment',method:'pix',paid_on:'2026-09-30'},
  ],'2026-10');
  assert.equal(cash.received,100); assert.equal(cash.refunded,20); assert.equal(cash.net,80); assert.equal(cash.deposits,30);
  assert.equal(cash.methods.find(m=>m.label==='Pix')?.refunded,20);
});
