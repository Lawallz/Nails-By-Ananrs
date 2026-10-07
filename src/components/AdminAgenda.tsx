import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { confirmationUrl, dateLabel, durationMinutes, isSunday, minutes, overlaps, studioToday, times } from '../lib/schedule';

type Service = { id: string; name: string; price: number; duration: string; description?: string };
type Booking = { id: string; service_id: string; service_name: string; price: number; date: string; time: string; client_name: string; client_phone: string };
type Block = { id: string; date: string; start_time: string; end_time: string };
const field = 'w-full rounded bg-zinc-900 border border-zinc-700 p-3 text-sm text-white';
const button = 'rounded border border-zinc-700 px-3 py-2 text-sm hover:border-[#dec0b3] disabled:opacity-40';
const empty = { service_id: '', date: '', time: '', client_name: '', client_phone: '' };
export function AdminAgenda({ services }: { services: Service[] }) {
  const [day, setDay] = useState(studioToday);
  const [month, setMonth] = useState(() => studioToday().slice(0, 7));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [slots, setSlots] = useState<Array<{ date: string; time: string; duration_minutes: number }>>([]);
  const [loading, setLoading] = useState(true);
  const monthRef = useRef(month);
  monthRef.current = month;
  const requestId = useRef(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [form, setForm] = useState(empty);
  const formRef = useRef<HTMLFormElement>(null);
  const [allDay, setAllDay] = useState(true);
  const [blockStart, setBlockStart] = useState('09:00');
  const [blockEnd, setBlockEnd] = useState('20:00');
  const [showAll, setShowAll] = useState(false);
  const load = async () => {
    const request = ++requestId.current;
    const targetMonth = monthRef.current;
    setLoading(true);
    try {
      const [b, x, s] = await Promise.all([
        supabase.from('bookings').select('*').gte('date', `${targetMonth}-01`).lte('date', `${targetMonth}-31`).order('date').order('time'),
        supabase.from('schedule_blocks').select('*').gte('date', `${targetMonth}-01`).lte('date', `${targetMonth}-31`).order('start_time'),
        supabase.from('booking_slots').select('date,time,duration_minutes').gte('date', `${targetMonth}-01`).lte('date', `${targetMonth}-31`),
      ]);
      if (b.error || x.error || s.error) throw b.error || x.error || s.error;
      if (request !== requestId.current) return;
      setBookings(b.data || []); setBlocks(x.data || []); setSlots(s.data || []);
    } catch (e) { if (request === requestId.current) { setBookings([]); setBlocks([]); setSlots([]); setError((e as Error).message || 'Não foi possível carregar a agenda.'); } }
    finally { if (request === requestId.current) setLoading(false); }
  };
  useEffect(() => { void load(); }, [month]);
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try { await action(); await load(); }
    catch (e) { setError((e as Error).message || 'Não foi possível salvar. Tente novamente.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const changeMonth = (delta: number) => {
    const d = new Date(`${month}-01T12:00:00`); d.setMonth(d.getMonth() + delta);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setMonth(m); setDay(`${m}-01`);
  };
  const edit = (b: Booking) => {
    setEditing(b); setForm(b); setError(''); setNotice('');
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    formRef.current?.querySelector('select')?.focus({ preventScroll: true });
  };
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      if (isSunday(form.date)) throw new Error('Domingo é folga. Escolha de segunda a sábado.');
      const service = services.find(s => s.id === form.service_id);
      if (!service) throw new Error('Selecione um serviço disponível.');
      const fields = { service_id: service.id, service_name: service.name, price: service.price, date: form.date, time: form.time, client_name: form.client_name.trim(), client_phone: form.client_phone.trim() };
      const query = editing ? supabase.from('bookings').update(fields).eq('id', editing.id) : supabase.from('bookings').insert({ id: crypto.randomUUID(), ...fields });
      const { data, error } = await query.select('id').single();
      if (error) throw error;
      if (!data) throw new Error('Agendamento não salvo. Confira seu acesso.');
      setNotice(editing ? 'Agendamento atualizado. Use o WhatsApp para avisar a cliente.' : 'Agendamento criado.');
      setDay(form.date); monthRef.current = form.date.slice(0, 7); setMonth(form.date.slice(0, 7)); setEditing(null); setForm(empty);
    });
  };
  const service = services.find(s => s.id === form.service_id);
  const visible = bookings.filter(b => showAll || b.date === day);
  const first = new Date(`${month}-01T12:00:00`).getDay();
  const count = new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate();
  return <section className="space-y-6" aria-label="Agenda do estúdio">
    <h2 className="text-xl font-serif text-[#dec0b3]">Agenda do estúdio</h2>
    {error && <p role="alert" className="text-rose-300">{error}</p>}
    {notice && <p role="status" className="text-emerald-300">{notice}</p>}
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {[['Agendamentos no mês', bookings.length], ['No dia selecionado', bookings.filter(b => b.date === day).length], ['Valor agendado no mês', bookings.reduce((n, b) => n + Number(b.price), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })]].map(([label, value]) => <div key={label} className="rounded border border-zinc-800 p-4"><p className="text-xs text-zinc-400">{label}</p><p className="text-xl text-[#dec0b3] mt-2">{loading ? '…' : value}</p></div>)}
    </div>
    <p className="text-xs text-zinc-500">O valor agendado é uma previsão, não uma confirmação de pagamento.</p>
    <div className="rounded border border-zinc-800 p-3 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <button className={button} disabled={loading || busy} onClick={() => changeMonth(-1)} aria-label="Mês anterior">←</button>
        <h3 className="capitalize text-center">{new Date(`${month}-01T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h3>
        <button className={button} disabled={loading || busy} onClick={() => changeMonth(1)} aria-label="Próximo mês">→</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(w => <span key={w} className="py-2 text-zinc-400">{w}</span>)}
        {Array.from({ length: first }, (_, i) => <span key={`empty-${i}`} />)}
        {Array.from({ length: count }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, '0')}`;
          const n = bookings.filter(b => b.date === date).length;
          const blocked = blocks.some(b => b.date === date);
          return <button key={date} disabled={loading} aria-pressed={day === date} aria-label={`${dateLabel(date)}, ${n} agendamentos${blocked ? ', com bloqueio' : ''}${isSunday(date) ? ', folga' : ''}`} onClick={() => { setDay(date); setShowAll(false); }} className={`min-h-16 rounded border p-1 ${day === date ? 'border-[#dec0b3] bg-[#dec0b3]/15' : 'border-zinc-800'} ${isSunday(date) ? 'text-zinc-500' : ''}`}><span>{i + 1}</span><span className="block text-[10px] text-[#dec0b3]">{n > 0 ? `${n} ag.` : ''}</span><span className="block text-[9px] text-amber-300">{blocked ? 'Bloq.' : isSunday(date) ? 'Folga' : ''}</span></button>;
        })}
      </div>
      <p className="text-xs text-zinc-400">Clique em uma data para consultar os agendamentos. Domingos são folga.</p>
    </div>
    <div className="flex flex-wrap justify-between gap-3 items-center"><h3>Agendamentos — {showAll ? 'mês inteiro' : dateLabel(day)}</h3><button className={button} onClick={() => setShowAll(v => !v)}>{showAll ? 'Ver somente o dia' : 'Ver mês inteiro'}</button><button className={button} disabled={loading || busy} onClick={() => { setError(''); void load(); }}>Atualizar agenda</button></div>
    {loading ? <p role="status">Carregando agenda…</p> : visible.length === 0 ? <p className="text-zinc-400 text-sm">Nenhum agendamento neste período.</p> : <div className="grid md:grid-cols-2 gap-4">{visible.map(b => {
      const url = confirmationUrl(b);
      const s = services.find(s => s.id === b.service_id);
      return <article key={b.id} className="rounded border border-zinc-800 p-5 space-y-3 min-w-0">
        <p className="font-semibold break-words">{b.client_name}</p><p className="text-[#dec0b3]">{dateLabel(b.date)} às {b.time}</p>
        <details><summary className="cursor-pointer text-sm break-words">{b.service_name} — ver detalhes</summary><p className="text-sm text-zinc-400 mt-2">{s?.description || 'Procedimento personalizado conforme avaliação no estúdio.'}{s ? ` Duração prevista: ${s.duration}.` : ''}</p></details>
        <p className="text-sm text-zinc-400">{b.client_phone} · {Number(b.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        <div className="flex flex-wrap gap-2"><button className={button} disabled={busy} onClick={() => edit(b)}>Editar</button>{url ? <a className={`${button} text-emerald-300`} href={url} target="_blank" rel="noopener noreferrer">Confirmar pelo WhatsApp</a> : <span className="text-xs text-amber-300">Edite o telefone para confirmar.</span>}<button className={`${button} text-rose-300`} disabled={busy} onClick={() => { if (confirm(`Excluir o agendamento de ${b.client_name}?`)) void run(async () => { const { data, error } = await supabase.from('bookings').delete().eq('id', b.id).select('id').single(); if (error) throw error; if (!data) throw new Error('Agendamento não excluído.'); if (editing?.id === b.id) { setEditing(null); setForm(empty); } setNotice('Agendamento excluído.'); }); }}>Excluir</button></div>
      </article>;
    })}</div>}
    <p className="text-xs text-zinc-500">A confirmação abre a conversa com a mensagem pronta. Revise e toque em enviar no WhatsApp.</p>
    <form ref={formRef} onSubmit={save} className="rounded border border-zinc-800 p-5 space-y-4">
      <h3 className="text-[#dec0b3]">{editing ? 'Editar agendamento' : 'Novo agendamento'}</h3>
      <fieldset disabled={busy} className="grid sm:grid-cols-2 gap-4">
        <label className="text-sm">Serviço<select className={field} required value={form.service_id} onChange={e => setForm({ ...form, service_id: e.target.value })}><option value="">Selecione</option>{!services.some(s => s.id === form.service_id) && form.service_id && <option value={form.service_id} disabled>Serviço removido — selecione outro</option>}{services.map(s => <option key={s.id} value={s.id}>{s.name} — R$ {s.price}</option>)}</select>{service && <span className="block mt-2 text-xs text-zinc-400 break-words">{service.name} · {service.duration}</span>}</label>
        <label className="text-sm">Data<input className={field} type="date" required min={studioToday()} value={form.date} onChange={e => setForm({ ...form, date: e.target.value, time: '' })} /></label>
        <label className="text-sm">Horário<select className={field} required value={form.time} onChange={e => setForm({ ...form, time: e.target.value })}><option value="">Selecione</option>{times.map(t => {
          const occupied = form.date.slice(0, 7) === month && (slots.some(s => s.date === form.date && !(editing && s.date === editing.date && s.time === editing.time) && overlaps(minutes(t), durationMinutes(service?.duration || '60'), minutes(s.time), s.duration_minutes)) || blocks.some(b => b.date === form.date && overlaps(minutes(t), durationMinutes(service?.duration || '60'), minutes(b.start_time), minutes(b.end_time) - minutes(b.start_time))));
          return <option key={t} disabled={occupied || isSunday(form.date)} value={t}>{t}{occupied ? ' — indisponível' : ''}</option>;
        })}</select></label>
        <label className="text-sm">Nome da cliente<input className={field} required minLength={2} maxLength={120} value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} /></label>
        <label className="text-sm">WhatsApp<input className={field} type="tel" required maxLength={30} value={form.client_phone} onChange={e => setForm({ ...form, client_phone: e.target.value })} /></label>
      </fieldset>
      <div className="flex gap-3"><button className={`${button} bg-[#dec0b3] text-zinc-950`} disabled={busy || loading} type="submit">{busy ? 'Salvando…' : editing ? 'Salvar alterações' : 'Criar agendamento'}</button>{editing && <button type="button" className={button} disabled={busy} onClick={() => { setEditing(null); setForm(empty); }}>Cancelar edição</button>}</div>
    </form>
    <form className="rounded border border-zinc-800 p-5 space-y-4" onSubmit={e => { e.preventDefault(); void run(async () => {
      const { error } = await supabase.from('schedule_blocks').insert({ date: day, start_time: allDay ? '00:00' : blockStart, end_time: allDay ? '24:00' : blockEnd });
      if (error) throw error; setNotice('Período bloqueado na agenda pública.');
    }); }}>
      <h3 className="text-[#dec0b3]">Bloquear agenda — {dateLabel(day)}</h3>
      <p className="text-xs text-zinc-400">Selecione o dia no calendário. Bloqueios que coincidam com agendamentos existentes serão recusados; reagende as clientes primeiro.</p>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} /> Dia inteiro</label>
      {!allDay && <div className="grid grid-cols-2 gap-3"><label>Início<input type="time" className={field} required value={blockStart} onChange={e => setBlockStart(e.target.value)} /></label><label>Fim<input type="time" className={field} required value={blockEnd} onChange={e => setBlockEnd(e.target.value)} /></label></div>}
      <button className={button} disabled={busy || loading || day < studioToday()}>Bloquear período</button>
      {blocks.filter(b => b.date === day).map(b => <div key={b.id} className="flex flex-wrap items-center gap-3 text-sm"><span>{b.start_time === '00:00' && b.end_time === '24:00' ? 'Dia inteiro bloqueado' : `${b.start_time}–${b.end_time} bloqueado`}</span><button type="button" className={button} disabled={busy} onClick={() => { if (confirm('Liberar este período para novos agendamentos?')) void run(async () => { const { error, data } = await supabase.from('schedule_blocks').delete().eq('id', b.id).select('id').single(); if (error) throw error; if (!data) throw new Error('Bloqueio não removido.'); setNotice('Período liberado.'); }); }}>Desbloquear</button></div>)}
    </form>
  </section>;
}
