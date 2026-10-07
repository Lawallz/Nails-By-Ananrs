export type AnalyticsBooking = {
  id: string;
  service_id: string;
  service_name: string;
  date: string;
  time: string;
  price: number | string;
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
  for (const booking of rows) {
    const day = daily.find(d => d.date === booking.date);
    if (!day) continue;
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
export function analyticsCsv(summary: BookingSummary, previous: BookingSummary, month: string) {
  const amount = (n: number) => n.toFixed(2).replace('.', ',');
  const rows: Array<Array<string | number>> = [
    ['Relatório de agendamentos', monthLabel(month)],
    ['Base', 'Data do atendimento; inclui agendamentos futuros. Valores não representam pagamentos. Registros excluídos não entram no relatório.'],
    ['Indicador', 'Mês selecionado', monthLabel(shiftMonth(month, -1))],
    ['Agendamentos', summary.count, previous.count],
    ['Valor agendado (R$)', amount(summary.value), amount(previous.value)],
    ['Ticket médio agendado (R$)', amount(summary.ticket), amount(previous.ticket)],
    ['Dias com agendamentos', summary.activeDays, previous.activeDays], [],
    ['Serviço', 'Agendamentos', 'Participação (%)', 'Valor agendado (R$)'],
    ...summary.services.map(s => [s.label, s.count, amount(summary.count ? s.count / summary.count * 100 : 0), amount(s.value)]), [],
    ['Dia da semana', 'Agendamentos', 'Ocorrências no mês', 'Média por ocorrência'],
    ...summary.weekdays.map(d => [d.label, d.count, d.occurrences, amount(d.average)]), [],
    ['Horário de início', 'Agendamentos'], ...summary.hours.map(h => [h.label, h.count]), [],
    ['Data', 'Agendamentos', 'Valor agendado (R$)'], ...summary.daily.map(d => [d.date, d.count, amount(d.value)]),
  ];
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(';')).join('\r\n');
}
