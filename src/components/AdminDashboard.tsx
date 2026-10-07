import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { studioToday, dateLabel } from '../lib/schedule';
import { AnalyticsBooking, analyticsCsv, money, monthLabel, shiftMonth, summarizeBookings, variation } from '../lib/bookingAnalytics';

const card = 'rounded-xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5 min-w-0';
const button = 'inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:border-[#dec0b3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#dec0b3] disabled:opacity-40';
function Bars({ items, total, color = 'bg-[#dec0b3]' }: { items: Array<{ label: string; count: number }>; total: number; color?: string }) {
  const maximum = Math.max(1, ...items.map(i => i.count));
  return <ul className="space-y-4 mt-5">{items.map((item, index) => <li key={`${item.label}-${index}`}>
    <div className="flex justify-between gap-3 text-sm"><span className="break-words min-w-0">{item.label}</span><span className="text-zinc-400 shrink-0">{item.count} <span className="text-xs">({total ? Math.round(item.count / total * 100) : 0}%)</span></span></div>
    <div aria-hidden="true" className="h-2 mt-2 rounded-full bg-zinc-800 overflow-hidden"><div className={`h-full rounded-full ${color}`} style={{ width: `${item.count / maximum * 100}%` }} /></div>
  </li>)}</ul>;
}
export function AdminDashboard({ revision }: { revision: number }) {
  const [month, setMonth] = useState(() => studioToday().slice(0, 7));
  const [refresh, setRefresh] = useState(0);
  const [state, setState] = useState<{ key: string; rows: AnalyticsBooking[]; loading: boolean; error: string }>({ key: '', rows: [], loading: true, error: '' });
  const key = `${month}:${revision}:${refresh}`;
  const previousMonth = shiftMonth(month, -1);
  useEffect(() => {
    const controller = new AbortController();
    setState({ key, rows: [], loading: true, error: '' });
    void (async () => {
      try {
        const rows: AnalyticsBooking[] = [];
        // Explicit pagination prevents silently truncating reports at the API row limit.
        for (let offset = 0; ; offset += 500) {
          const { data, error } = await supabase.from('bookings')
            .select('id,service_id,service_name,date,time,price')
            .gte('date', `${previousMonth}-01`).lt('date', `${shiftMonth(month, 1)}-01`)
            .order('date').order('id').range(offset, offset + 499).abortSignal(controller.signal);
          if (error) throw error;
          rows.push(...(data || []));
          if (!data || data.length < 500) break;
        }
        if (!controller.signal.aborted) setState({ key, rows, loading: false, error: '' });
      } catch (e) {
        if (!controller.signal.aborted) setState({ key, rows: [], loading: false, error: (e as Error).message || 'Não foi possível carregar o relatório.' });
      }
    })();
    return () => controller.abort();
  }, [key, month, previousMonth]);
  const loading = state.loading || state.key !== key;
  const summary = useMemo(() => summarizeBookings(state.rows, month), [state.rows, month]);
  const previous = useMemo(() => summarizeBookings(state.rows, previousMonth), [state.rows, previousMonth]);
  const peakDays = summary.weekdays.filter(d => d.count > 0 && d.count === Math.max(...summary.weekdays.map(w => w.count)));
  const peakHours = summary.hours.filter(h => h.count === Math.max(...summary.hours.map(x => x.count)));
  const exportReport = () => {
    const url = URL.createObjectURL(new Blob([analyticsCsv(summary, previous, month)], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = `relatorio-nails-${month}.csv`;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section aria-labelledby="dashboard-heading" className="space-y-5 border-b border-zinc-800 pb-8">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="text-xs uppercase tracking-widest text-[#dec0b3]">Visão do negócio</p><h2 id="dashboard-heading" className="text-2xl font-serif mt-1 flex items-center gap-2"><BarChart3 size={22} /> Dashboard</h2></div>
      <div className="flex flex-wrap gap-2"><button className={button} disabled={loading} onClick={() => setRefresh(n => n + 1)}><RefreshCw size={16} /> Atualizar</button><button className={button} disabled={loading || !!state.error || !summary.count} onClick={exportReport}><Download size={16} /> Baixar relatório CSV</button></div>
    </div>
    <div className="flex flex-wrap gap-3 items-end">
      <button className={button} disabled={month <= '2000-01'} aria-label="Mês anterior do relatório" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft size={18} /></button>
      <label className="text-xs text-zinc-400 min-w-0">Mês do relatório<input type="month" min="2000-01" max="2100-12" value={month} onChange={e => { if (/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(e.target.value)) setMonth(e.target.value); }} className="block mt-1 rounded-lg bg-zinc-900 border border-zinc-700 p-2 text-base text-white max-w-full" /></label>
      <button className={button} disabled={month >= '2100-12'} aria-label="Próximo mês do relatório" onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight size={18} /></button>
      <button className={button} onClick={() => setMonth(studioToday().slice(0, 7))}>Mês atual</button>
    </div>
    <p className="text-xs text-zinc-400 leading-relaxed">Pela data do atendimento, incluindo horários futuros. Comparação com {monthLabel(previousMonth)} inteiro. Meses em andamento ainda podem receber novos agendamentos. Valores não comprovam pagamento ou atendimento realizado.</p>
    {loading ? <p role="status" className="p-8 text-center text-zinc-400">Carregando indicadores…</p> : state.error ? <div role="alert" className="rounded-lg border border-rose-900 p-4 text-rose-300">Não foi possível carregar os indicadores. {state.error} Use Atualizar para tentar novamente.</div> : <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: 'Agendamentos', value: String(summary.count), comparison: variation(summary.count, previous.count), before: String(previous.count) },
          { label: 'Valor agendado', value: money(summary.value), comparison: variation(summary.value, previous.value), before: money(previous.value) },
          { label: 'Ticket médio agendado', value: money(summary.ticket), comparison: variation(summary.ticket, previous.ticket), before: money(previous.ticket) },
          { label: 'Dias com agendamentos', value: String(summary.activeDays), comparison: `${summary.activeDays ? (summary.count / summary.activeDays).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : 0} agendamentos por dia com agenda`, before: String(previous.activeDays) },
        ].map(item => <div key={item.label} className={card}><h3 className="text-xs text-zinc-400">{item.label}</h3><p className="text-2xl font-semibold text-[#dec0b3] mt-3 break-words">{item.value}</p><p className="text-xs text-zinc-300 mt-2">{item.comparison}</p><p className="text-xs text-zinc-500 mt-1">Mês anterior: {item.before}</p></div>)}
      </div>
      {!summary.count ? <div className={`${card} text-center py-10`}><h3 className="text-lg">Nenhum agendamento neste mês</h3><p className="text-sm text-zinc-400 mt-2">Escolha outro período ou cadastre agendamentos para acompanhar os indicadores.</p></div> : <>
        <div className="grid lg:grid-cols-3 gap-4">
          <div className={`${card} lg:col-span-2`}><h3 className="font-semibold">Serviços mais agendados</h3><p className="text-xs text-zinc-400 mt-1">Os 5 primeiros por quantidade de agendamentos.</p><Bars items={summary.services.slice(0, 5)} total={summary.count} /></div>
          <div className={`${card} space-y-5`}><h3 className="font-semibold">Destaques do mês</h3><div><p className="text-xs text-zinc-400">Serviço líder no ranking</p><p className="text-[#dec0b3] mt-1 break-words">{summary.services[0]?.label}</p><p className="text-xs mt-1">{summary.services[0]?.count} agendamentos · {money(summary.services[0]?.value || 0)}</p></div><div><p className="text-xs text-zinc-400">Dias da semana com maior procura</p><p className="mt-1">{peakDays.map(d => d.label).join(', ')}</p></div><div><p className="text-xs text-zinc-400">Horários de início mais procurados</p><p className="mt-1">{peakHours.map(h => h.label).join(', ')}</p></div></div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className={card}><h3 className="font-semibold">Procura por dia da semana</h3><p className="text-xs text-zinc-400 mt-1">Quantidade total no mês; não representa taxa de ocupação.</p><Bars items={summary.weekdays} total={summary.count} color="bg-sky-300" /></div>
          <div className={card}><h3 className="font-semibold">Horários mais procurados</h3><p className="text-xs text-zinc-400 mt-1">Horário de início dos agendamentos.</p><Bars items={summary.hours} total={summary.count} color="bg-emerald-300" /></div>
        </div>
        <div className={card}><h3 className="font-semibold mb-4">Relatório por serviço</h3><div className="overflow-x-auto"><table className="w-full text-sm text-left"><caption className="sr-only">Quantidade, participação e valor agendado por serviço em {monthLabel(month)}</caption><thead className="text-xs text-zinc-400"><tr><th scope="col" className="py-3 pr-4">Serviço</th><th scope="col" className="py-3 px-3 text-right">Qtd.</th><th scope="col" className="py-3 px-3 text-right">Participação</th><th scope="col" className="py-3 pl-3 text-right">Valor agendado</th></tr></thead><tbody>{summary.services.map(s => <tr key={s.id} className="border-t border-zinc-800"><th scope="row" className="py-3 pr-4 font-normal min-w-40">{s.label}</th><td className="p-3 text-right">{s.count}</td><td className="p-3 text-right">{(s.count / summary.count * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</td><td className="py-3 pl-3 text-right whitespace-nowrap">{money(s.value)}</td></tr>)}</tbody></table></div></div>
        <details className={card}><summary className="cursor-pointer font-semibold">Ver relatório diário de {monthLabel(month)}</summary><div className="overflow-x-auto mt-4"><table className="w-full text-sm text-left"><thead className="text-zinc-400"><tr><th scope="col" className="py-2">Data</th><th scope="col" className="p-2 text-right">Agendamentos</th><th scope="col" className="py-2 text-right">Valor agendado</th></tr></thead><tbody>{summary.daily.map(d => <tr key={d.date} className="border-t border-zinc-800"><th scope="row" className="py-2 font-normal whitespace-nowrap">{dateLabel(d.date)}</th><td className="p-2 text-right">{d.count}</td><td className="py-2 text-right whitespace-nowrap">{money(d.value)}</td></tr>)}</tbody></table></div></details>
      </>}
      <p className="text-xs text-zinc-500">O relatório CSV contém resumo, serviços, dias da semana, horários e detalhamento diário. Agendamentos excluídos deixam de aparecer. O sistema ainda não mede cancelamentos, faltas ou pagamentos.</p>
    </>}
  </section>;
}
