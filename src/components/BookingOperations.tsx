import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { dateLabel, studioToday } from '../lib/schedule';
import { money } from '../lib/bookingAnalytics';
import { BookingStatus, ManagedBooking, Payment, isInactive, outstanding, paymentKinds, paymentMethods, phoneKey, statuses } from '../lib/bookingOperations';
const field = 'block w-full mt-1 rounded bg-zinc-900 border border-zinc-700 p-2 text-sm text-white';
const button = 'rounded border border-zinc-700 px-3 py-2 text-sm hover:border-[#dec0b3] disabled:opacity-40';
export function BookingOperations({ booking, onChanged }: { booking: ManagedBooking; onChanged: () => Promise<void> }) {
  const [panel, setPanel] = useState<'status' | 'payments' | 'history' | null>(null);
  const [status, setStatus] = useState<BookingStatus>(booking.status);
  const [reason, setReason] = useState(booking.cancellation_reason || '');
  const [notes, setNotes] = useState(booking.client_notes || '');
  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState<Payment['kind']>(isInactive(booking.status) ? 'refund' : 'payment');
  const [method, setMethod] = useState<Payment['method']>('pix');
  const [paidOn, setPaidOn] = useState(studioToday);
  const [paymentNote, setPaymentNote] = useState('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [history, setHistory] = useState<ManagedBooking[]>([]);
  const [historyPage, setHistoryPage] = useState(0);
  const [moreHistory, setMoreHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => { if (isInactive(booking.status)) setKind('refund'); }, [booking.status]);
  useEffect(() => { setStatus(booking.status); setReason(booking.cancellation_reason || ''); setNotes(booking.client_notes || ''); }, [booking.status, booking.cancellation_reason, booking.client_notes]);
  useEffect(() => {
    if (panel !== 'payments' && panel !== 'history') return;
    const controller = new AbortController(); setLoading(true); setError('');
    void (async () => {
      try {
        if (panel === 'payments') {
          const rows: Payment[] = [];
          for (let offset = 0; ; offset += 100) {
            const { data, error } = await supabase.from('booking_payments').select('*').eq('booking_id', booking.id).order('paid_on', { ascending: false }).order('id').range(offset, offset + 99).abortSignal(controller.signal);
            if (error) throw error; rows.push(...(data || [])); if (!data || data.length < 100) break;
          }
          if (!controller.signal.aborted) setPayments(rows);
        } else {
          const { data, error } = await supabase.from('bookings').select('*').eq('client_phone_key', phoneKey(booking.client_phone)).order('date', { ascending: false }).order('id').range(historyPage * 20, historyPage * 20 + 20).abortSignal(controller.signal);
          if (error) throw error;
          if (!controller.signal.aborted) { setHistory((data || []).slice(0, 20)); setMoreHistory((data || []).length > 20); }
        }
      } catch (e) { if (!controller.signal.aborted) { setError((e as Error).message || 'Não foi possível carregar.'); setPayments([]); setHistory([]); } }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [panel, booking.id, booking.client_phone, refresh, historyPage]);
  const save = async (action: () => Promise<void>, message: string) => {
    if (lock.current) return; lock.current = true; setBusy(true); setError(''); setNotice('');
    try { await action(); setNotice(message); setRefresh(n => n + 1); await onChanged(); }
    catch (e) { setError((e as Error).message || 'Não foi possível salvar.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <div className="space-y-3 border-t border-zinc-800 pt-3">
    <div className="flex flex-wrap gap-2">{(['status','payments','history'] as const).map(p => <button key={p} type="button" className={button} disabled={busy} aria-expanded={panel === p} onClick={() => { setPanel(panel === p ? null : p); setError(''); setNotice(''); }}>{p === 'status' ? 'Status e observações' : p === 'payments' ? 'Pagamentos' : 'Histórico da cliente'}</button>)}</div>
    {booking.status !== 'cancelled' && <button type="button" className={`${button} text-rose-300`} disabled={busy} onClick={() => { setPanel('status'); setStatus('cancelled'); }}>Cancelar atendimento</button>}
    <p className="text-xs text-zinc-400">Recebido líquido: {money(Number(booking.paid_amount || 0))} · Pendente: {money(outstanding(booking))}</p>
    {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}{notice && <p role="status" className="text-sm text-emerald-300">{notice}</p>}
    {panel === 'status' && <form className="space-y-3" onSubmit={e => { e.preventDefault(); void save(async () => {
      if (status === 'cancelled' && !reason.trim()) throw new Error('Informe o motivo do cancelamento.');
      const { error, data } = await supabase.from('bookings').update({ status, cancellation_reason: status === 'cancelled' ? reason.trim() : booking.cancellation_reason || '', client_notes: notes.trim() }).eq('id', booking.id).select('id').single();
      if (error) throw error; if (!data) throw new Error('Atendimento não atualizado.');
    }, 'Status e observações salvos.'); }}>
      <fieldset disabled={busy} className="space-y-3"><label className="block text-sm">Status<select className={field} value={status} onChange={e => setStatus(e.target.value as BookingStatus)}>{Object.entries(statuses).map(([key, label]) => <option key={key} value={key} disabled={booking.date > studioToday() && (key === 'completed' || key === 'no_show')}>{label}</option>)}</select></label>
      {status === 'cancelled' && <label className="block text-sm">Motivo do cancelamento<textarea required maxLength={1000} className={field} value={reason} onChange={e => setReason(e.target.value)} /></label>}
      <label className="block text-sm">Observações deste atendimento<textarea maxLength={3000} className={field} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Preferências, cuidados e observações da cliente" /></label>
      {status === 'cancelled' && Number(booking.paid_amount) > 0 && <p className="text-xs text-amber-300">Há valor recebido. Cancelar não registra devolução: use Pagamentos para lançar o estorno, se realizado.</p>}
      <button className={button} disabled={busy}>{busy ? 'Salvando…' : 'Salvar status e observações'}</button></fieldset>
      <p className="text-xs text-zinc-500">Cancelamento e falta liberam o horário. Reativar depende da disponibilidade. Abrir o WhatsApp não altera o status automaticamente.</p>
    </form>}
    {panel === 'payments' && <div className="space-y-4">
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); void save(async () => {
        const value = Number(amount.replace(',', '.')); if (!Number.isFinite(value) || value <= 0) throw new Error('Informe um valor maior que zero.');
        const { error } = await supabase.from('booking_payments').insert({ id: crypto.randomUUID(), booking_id: booking.id, amount: value, kind, method, paid_on: paidOn, note: paymentNote.trim() });
        if (error) throw error; setAmount(''); setPaymentNote('');
      }, 'Lançamento registrado.'); }}><fieldset disabled={busy || loading} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-sm">Tipo<select className={field} value={kind} onChange={e => setKind(e.target.value as Payment['kind'])}>{Object.entries(paymentKinds).map(([key,label]) => <option key={key} value={key} disabled={isInactive(booking.status) && key !== 'refund'}>{label}</option>)}</select></label>
        <label className="text-sm">Valor (R$)<input className={field} type="number" min="0.01" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} /></label>
        <label className="text-sm">Forma de pagamento<select className={field} value={method} onChange={e => setMethod(e.target.value as Payment['method'])}>{Object.entries(paymentMethods).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="text-sm">Data do lançamento<input type="date" className={field} required max={studioToday()} value={paidOn} onChange={e => setPaidOn(e.target.value)} /></label>
        <label className="text-sm sm:col-span-2">{kind === 'refund' ? 'Motivo do estorno' : 'Observação (opcional)'}<input className={field} required={kind === 'refund'} maxLength={500} value={paymentNote} onChange={e => setPaymentNote(e.target.value)} /></label>
        <button className={button} disabled={busy || loading || (isInactive(booking.status) && kind !== 'refund')}>{busy ? 'Salvando…' : 'Registrar lançamento'}</button>
      </fieldset></form>
      <p className="text-xs text-zinc-500">Registre somente valores efetivamente recebidos ou devolvidos. Para corrigir um recebimento, lance um estorno e depois o pagamento correto. Os lançamentos ficam preservados.</p>
      {loading ? <p role="status">Carregando pagamentos…</p> : payments.length === 0 ? <p className="text-sm text-zinc-400">Nenhum lançamento registrado.</p> : <ul className="space-y-2">{payments.map(p => <li key={p.id} className="rounded bg-zinc-900 p-3 text-sm"><p>{dateLabel(p.paid_on)} · {paymentKinds[p.kind]} · {money(Number(p.amount))}</p><p className="text-xs text-zinc-400">{paymentMethods[p.method]}{p.note ? ` · ${p.note}` : ''}</p></li>)}</ul>}
    </div>}
    {panel === 'history' && <div className="space-y-3"><p className="text-xs text-zinc-400">Histórico associado ao WhatsApp {booking.client_phone}. Se o número for compartilhado, confira o nome em cada atendimento.</p>
      {loading ? <p role="status">Carregando histórico…</p> : history.length === 0 ? <p>Nenhum atendimento encontrado.</p> : <ul className="space-y-3">{history.map(h => <li key={h.id} className="rounded bg-zinc-900 p-3 text-sm space-y-1"><p>{h.client_name} · {dateLabel(h.date)} às {h.time}</p><p className="break-words">{h.service_name} · {statuses[h.status]}</p><p className="text-xs text-zinc-400">Valor: {money(Number(h.price))} · Recebido: {money(Number(h.paid_amount || 0))}</p>{h.client_notes && <p className="text-xs whitespace-pre-wrap">{h.client_notes}</p>}{h.cancellation_reason && <p className="text-xs text-amber-300">Motivo registrado: {h.cancellation_reason}</p>}</li>)}</ul>}
      <div className="flex justify-between gap-2"><button className={button} disabled={loading || !historyPage} onClick={() => setHistoryPage(n => n - 1)}>Anterior</button><span className="text-xs self-center">Página {historyPage + 1}</span><button className={button} disabled={loading || !moreHistory} onClick={() => setHistoryPage(n => n + 1)}>Próxima</button></div>
    </div>}
  </div>;
}
