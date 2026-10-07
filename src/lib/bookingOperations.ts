import { confirmationUrl, dateLabel, studioToday } from './schedule';
export const statuses = { scheduled: 'Agendado', confirmed: 'Confirmado', completed: 'Concluído', cancelled: 'Cancelado', no_show: 'Falta' } as const;
export type BookingStatus = keyof typeof statuses;
export type ManagedBooking = { id: string; service_id: string; service_name: string; price: number; date: string; time: string; client_name: string; client_phone: string; client_phone_key: string; status: BookingStatus; client_notes: string; cancellation_reason: string; paid_amount: number };
export const paymentMethods = { pix: 'Pix', cash: 'Dinheiro', debit: 'Cartão de débito', credit: 'Cartão de crédito', transfer: 'Transferência', other: 'Outro' } as const;
export type Payment = { id: string; booking_id: string; amount: number; kind: 'deposit' | 'payment' | 'refund'; method: keyof typeof paymentMethods; paid_on: string; note: string };
export const paymentKinds = { deposit: 'Sinal', payment: 'Pagamento', refund: 'Estorno' } as const;
export const isInactive = (status: string) => status === 'cancelled' || status === 'no_show';
export const canEditSchedule = (status: string) => status === 'scheduled' || status === 'confirmed';
export const outstanding = (booking: {price: number | string; paid_amount?: number | string; status?: string}) => isInactive(booking.status || '') ? 0 : Math.max(0, Math.round((Number(booking.price) - Number(booking.paid_amount || 0)) * 100) / 100);
export function phoneKey(value: string) {
  const digits = value.replace(/\D/g, '');
  return /^55\d{10,11}$/.test(digits) ? digits.slice(2) : digits;
}
export function reminderUrl(booking: ManagedBooking) {
  const original = confirmationUrl(booking);
  if (!original) return null;
  const url = new URL(original);
  url.searchParams.set('text', `Olá, ${booking.client_name}! 💅 Passando para lembrar do seu horário na Nails by Ananrs:\n\nServiço: ${booking.service_name}\nData: ${dateLabel(booking.date)}\nHorário: ${booking.time}\nEndereço: Rua Julio de Mesquita, 658, São Bernardo do Campo.\n\nPode confirmar sua presença? Se precisar reagendar, avise por aqui.`);
  return url.toString();
}
export function addDays(date: string, amount: number) {
  const result = new Date(`${date}T12:00:00`); result.setDate(result.getDate() + amount);
  return `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(2, '0')}-${String(result.getDate()).padStart(2, '0')}`;
}
export function weekDates(date: string) {
  const weekday = new Date(`${date}T12:00:00`).getDay();
  const monday = addDays(date, -((weekday + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}
export const todayOrLater = (date: string) => date >= studioToday();
