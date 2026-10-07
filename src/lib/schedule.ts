export const studioToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const dateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR');
export const isSunday = (date: string) => new Date(`${date}T12:00:00`).getDay() === 0;
export const minutes = (time: string) => { const [h, m] = time.split(':').map(Number); return h * 60 + m; };
export const durationMinutes = (value: string) => {
  if (/^\d{1,2}:\d{2}$/.test(value)) return minutes(value);
  const hours = value.match(/(\d+)\s*h/i);
  const mins = value.match(/(\d+)\s*min/i);
  return Math.max(1, Math.min(720, hours ? Number(hours[1]) * 60 + Number(mins?.[1] || value.match(/h\s*(\d+)/i)?.[1] || 0) : Number(mins?.[1] || value.match(/\d+/)?.[0] || 60)));
};
export const times = Array.from({ length: 11 }, (_, i) => `${String(i + 9).padStart(2, '0')}:00`);
export const overlaps = (start: number, duration: number, otherStart: number, otherDuration: number) => start < otherStart + otherDuration && start + duration > otherStart;
export function confirmationUrl(b: {client_name: string; client_phone: string; service_name: string; date: string; time: string}) {
  let phone = b.client_phone.replace(/\D/g, '');
  if (phone.length === 10 || phone.length === 11) phone = `55${phone}`;
  if (!/^55\d{10,11}$/.test(phone)) return null;
  const text = `Olá, ${b.client_name}! 💅 Seu agendamento na Nails by Ananrs está confirmado:\n\nServiço: ${b.service_name}\nData: ${dateLabel(b.date)}\nHorário: ${b.time}\nEndereço: Rua Julio de Mesquita, 658, São Bernardo do Campo.\n\nSe precisar alterar, avise por aqui. Te espero!`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
