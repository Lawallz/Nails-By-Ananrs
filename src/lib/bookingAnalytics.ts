import { isInactive, outstanding, paymentMethods } from './bookingOperations';
export type AnalyticsBooking = {
  id: string;
  service_id: string;
  service_name: string;
  date: string;
  time: string;
  price: number | string;
  status?: string;
  paid_amount?: number | string;
};
export const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export function shiftMonth(month: string, offset: number) {
  const date = new Date(`${month}-01T12:00:00`);
  date.setMonth(date.getMonth() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
export function monthLabel(month: string) {
  return new Date(`${month}-01T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}
export function variation(current: number, previous: number) {
  if (!previous) return current ? 'Sem base no mês anterior' : 'Sem variação';
  const percent = (current - previous) / previous * 100;
  return `${percent > 0 ? '+' : ''}${percent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% vs. mês anterior`;
}
export function summarizeBookings(rows: AnalyticsBooking[], month: string) {
  const daysInMonth = new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate();
  const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map(label => ({ label, count: 0, occurrences: 0, average: 0 }));
  const daily = Array.from({ length: daysInMonth }, (_, i) => ({ date: `${month}-${String(i + 1).padStart(2, '0')}`, count: 0, value: 0 }));
  daily.forEach(d => weekdays[new Date(`${d.date}T12:00:00`).getDay()].occurrences++);
  const services = new Map<string, { id: string; label: string; count: number; value: number; latest: string }>();
  const hours = new Map<string, number>();
  let value = 0;
  let count = 0;
  let total = 0, completed = 0, cancelled = 0, noShow = 0, pending = 0, receivedForBookings = 0;
  for (const booking of rows) {
    const day = daily.find(d => d.date === booking.date);
    if (!day) continue;
    total++;
    receivedForBookings += Number(booking.paid_amount || 0);
    if (booking.status === 'cancelled') cancelled++;
    if (booking.status === 'no_show') noShow++;
    if (booking.status === 'completed') completed++;
    if (isInactive(booking.status || '')) continue;
    pending += outstanding(booking);
    const price = Number(booking.price);
    const amount = Number.isFinite(price) ? price : 0;
    count++; value += amount; day.count++; day.value += amount;
    weekdays[new Date(`${booking.date}T12:00:00`).getDay()].count++;
    const key = booking.service_id || booking.service_name;
    const service = services.get(key) || { id: key, label: booking.service_name || 'Serviço sem nome', count: 0, value: 0, latest: '' };
    service.count++; service.value += amount;
    if (booking.date >= service.latest) { service.label = booking.service_name || service.label; service.latest = booking.date; }
    services.set(key, service);
    hours.set(booking.time, (hours.get(booking.time) || 0) + 1);
  }
  weekdays.forEach(d => { d.average = d.occurrences ? d.count / d.occurrences : 0; });
  return {
    total, completed, cancelled, noShow, pending, receivedForBookings,
    cancellationRate: total ? cancelled / total * 100 : 0,
    noShowRate: total ? noShow / total * 100 : 0,
    count, value, ticket: count ? value / count : 0,
    activeDays: daily.filter(d => d.count).length,
    services: [...services.values()].sort((a, b) => b.count - a.count || b.value - a.value || a.label.localeCompare(b.label, 'pt-BR')),
    weekdays, daily,
    hours: [...hours].sort(([a], [b]) => a.localeCompare(b)).map(([label, count]) => ({ label, count })),
  };
}
export type BookingSummary = ReturnType<typeof summarizeBookings>;
// Prevent spreadsheet formula execution, including cells prefixed with whitespace.
export function csvCell(value: string | number) {
  let text = String(value);
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
export function analyticsCsv(summary: BookingSummary, previous: BookingSummary, month: string, cash = summarizeCash([], month), previousCash = summarizeCash([], shiftMonth(month, -1))) {
  const amount = (n: number) => n.toFixed(2).replace('.', ',');
  const rows: Array<Array<string | number>> = [
    ['Relatório de agendamentos', monthLabel(month)],
    ['Base', 'Agenda pela data do atendimento, excluindo cancelamentos e faltas dos valores previstos. Recebimentos e estornos pela data do lançamento. Somente valores registrados; não integra banco ou operadora.'],
    ['Indicador', 'Mês selecionado', monthLabel(shiftMonth(month, -1))],
    ['Registros totais', summary.total, previous.total],
    ['Agendamentos válidos (inclui concluídos)', summary.count, previous.count],
    ['Concluídos', summary.completed, previous.completed],
    ['Cancelamentos', summary.cancelled, previous.cancelled],
    ['Faltas', summary.noShow, previous.noShow],
    ['Taxa de cancelamento sobre registros (%)', amount(summary.cancellationRate), amount(previous.cancellationRate)],
    ['Taxa de falta sobre registros (%)', amount(summary.noShowRate), amount(previous.noShowRate)],
    ['Saldo pendente dos atendimentos (R$)', amount(summary.pending), amount(previous.pending)],
    ['Recebimentos registrados no mês (R$)', amount(cash.received), amount(previousCash.received)],
    ['Estornos registrados no mês (R$)', amount(cash.refunded), amount(previousCash.refunded)],
    ['Recebido líquido registrado no mês (R$)', amount(cash.net), amount(previousCash.net)],
    ['Valor agendado (R$)', amount(summary.value), amount(previous.value)],
    ['Ticket médio agendado (R$)', amount(summary.ticket), amount(previous.ticket)],
    ['Dias com agendamentos', summary.activeDays, previous.activeDays], [],
    ['Forma de pagamento', 'Recebimentos (R$)', 'Estornos (R$)', 'Líquido (R$)'],
    ...cash.methods.map(m => [m.label, amount(m.received), amount(m.refunded), amount(m.received - m.refunded)]), [],
    ['Serviço', 'Agendamentos', 'Participação (%)', 'Valor agendado (R$)'],
    ...summary.services.map(s => [s.label, s.count, amount(summary.count ? s.count / summary.count * 100 : 0), amount(s.value)]), [],
    ['Dia da semana', 'Agendamentos', 'Ocorrências no mês', 'Média por ocorrência'],
    ...summary.weekdays.map(d => [d.label, d.count, d.occurrences, amount(d.average)]), [],
    ['Horário de início', 'Agendamentos'], ...summary.hours.map(h => [h.label, h.count]), [],
    ['Data', 'Agendamentos', 'Valor agendado (R$)'], ...summary.daily.map(d => [d.date, d.count, amount(d.value)]),
  ];
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(';')).join('\r\n');
}

export type CashEntry = { id: string; amount: number | string; kind: string; method: string; paid_on: string };
export function summarizeCash(rows: CashEntry[], month: string) {
  let receivedCents = 0, refundedCents = 0, depositsCents = 0, count = 0;
  const methods = new Map<string, { label: string; received: number; refunded: number }>();
  for (const row of rows) {
    if (!row.paid_on.startsWith(`${month}-`)) continue;
    const cents = Math.round(Number(row.amount) * 100);
    if (!Number.isFinite(cents)) continue;
    count++;
    const m = methods.get(row.method) || { label: paymentMethods[row.method as keyof typeof paymentMethods] || row.method, received: 0, refunded: 0 };
    if (row.kind === 'refund') { refundedCents += cents; m.refunded += cents; }
    else { receivedCents += cents; m.received += cents; if (row.kind === 'deposit') depositsCents += cents; }
    methods.set(row.method, m);
  }
  return { count, received: receivedCents / 100, refunded: refundedCents / 100, net: (receivedCents - refundedCents) / 100, deposits: depositsCents / 100,
    methods: [...methods.values()].map(m => ({...m,received:m.received/100,refunded:m.refunded/100})) };
}
