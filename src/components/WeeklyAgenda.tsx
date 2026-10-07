import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { dateLabel, isSunday, minutes, overlaps, studioToday, times } from '../lib/schedule';
import { addDays, ManagedBooking, statuses, weekDates } from '../lib/bookingOperations';
const button = 'rounded border border-zinc-700 px-3 py-2 text-sm disabled:opacity-40';
type Slot = {date: string; time: string; duration_minutes: number};
type Block = {date: string; start_time: string; end_time: string};
export function WeeklyAgenda({ date, revision, onSelect }: { date: string; revision: number; onSelect: (date: string, time?: string) => void }) {
  const dates = weekDates(date); const start = dates[0]; const end = dates[6];
  const key = `${start}:${revision}`;
  const [data, setData] = useState<{ key: string; bookings: ManagedBooking[]; slots: Slot[]; blocks: Block[]; error: string }>({key:'',bookings:[],slots:[],blocks:[],error:''});
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const [b,s,x] = await Promise.all([
          supabase.from('bookings').select('*').in('status',['scheduled','confirmed','completed']).gte('date',start).lte('date',end).order('time').abortSignal(controller.signal),
          supabase.from('booking_slots').select('date,time,duration_minutes').gte('date',start).lte('date',end).abortSignal(controller.signal),
          supabase.from('schedule_blocks').select('date,start_time,end_time').gte('date',start).lte('date',end).abortSignal(controller.signal),
        ]);
        if (b.error || s.error || x.error) throw b.error || s.error || x.error;
        if (!controller.signal.aborted) setData({key,bookings:b.data||[],slots:s.data||[],blocks:x.data||[],error:''});
      } catch(e) { if (!controller.signal.aborted) setData({key,bookings:[],slots:[],blocks:[],error:(e as Error).message || 'Não foi possível carregar a semana.'}); }
    })();
    return () => controller.abort();
  }, [key, start, end]);
  const loading=data.key!==key;
  return <section className="space-y-4 rounded border border-zinc-800 p-3 sm:p-5" aria-label="Visão semanal">
    <div className="flex flex-wrap justify-between gap-3 items-center"><button className={button} onClick={() => onSelect(addDays(date,-7))}>← Semana anterior</button><h3>{dateLabel(start)} a {dateLabel(end)}</h3><button className={button} onClick={() => onSelect(addDays(date,7))}>Próxima semana →</button></div>
    <p className="text-xs text-zinc-400">Clique em um horário livre para iniciar um agendamento. A duração do serviço será verificada ao salvar. Horários ocupados abrem os atendimentos do dia.</p>
    {loading ? <p role="status">Carregando semana…</p> : data.error ? <p role="alert" className="text-rose-300">{data.error}</p> : <div className="overflow-x-auto"><table className="w-full text-xs border-separate border-spacing-1"><caption className="sr-only">Agenda semanal com horários livres, ocupados e bloqueados</caption><thead><tr><th scope="col">Horário</th>{dates.map(d => <th key={d} scope="col" className="min-w-28 p-2"><button onClick={() => onSelect(d)} className="underline underline-offset-4">{new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR',{weekday:'short'})}<br/>{dateLabel(d).slice(0,5)}</button></th>)}</tr></thead><tbody>{times.map(time => <tr key={time}><th scope="row" className="p-2">{time}</th>{dates.map(d => {
      const slot = data.slots.find(s => s.date===d && overlaps(minutes(time),60,minutes(s.time),s.duration_minutes));
      const booking = slot && data.bookings.find(b => b.date===d && b.time===slot.time);
      const block = data.blocks.some(b => b.date===d && overlaps(minutes(time),60,minutes(b.start_time),minutes(b.end_time)-minutes(b.start_time)));
      const closed = isSunday(d); const unavailable = !!slot || block || closed;
      const past = d < studioToday();
      const label = slot ? booking ? `${booking.client_name} · ${statuses[booking.status]}` : 'Ocupado' : closed ? 'Folga' : block ? 'Bloqueado' : past ? 'Sem agendamento' : 'Livre';
      return <td key={d}><button className={`w-full min-h-16 rounded p-2 text-left break-words ${slot ? 'bg-[#dec0b3]/15 text-[#dec0b3]' : unavailable || past ? 'bg-zinc-900 text-zinc-500' : 'bg-emerald-950/50 text-emerald-300 hover:bg-emerald-900/50'}`} onClick={() => onSelect(d, !unavailable && !past ? time : undefined)} aria-label={`${dateLabel(d)} às ${time}: ${label}`}>{label}</button></td>;
    })}</tr>)}</tbody></table></div>}
  </section>;
}
