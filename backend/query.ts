import type { PoolClient } from 'pg';
const readable: Record<string, string[]> = {
  services: ['id','name','price','duration','image','created_at','description'],
  ai_color_catalog: ['id','name','hex','created_at'],
  booking_slots: ['date','time','duration_minutes'],
  schedule_blocks: ['id','date','start_time','end_time'],
  bookings: ['id','service_id','service_name','price','date','time','client_name','client_phone','created_at','status','cancellation_reason','client_notes','paid_amount','client_phone_key'],
  booking_payments: ['id','booking_id','amount','kind','method','paid_on','note','created_at'],
};
const writable: Record<string, string[]> = {
  services: ['id','name','price','duration','image','description'],
  schedule_blocks: ['id','date','start_time','end_time'],
  bookings: ['id','service_id','service_name','price','date','time','client_name','client_phone','status','cancellation_reason','client_notes'],
  booking_payments: ['id','booking_id','amount','kind','method','paid_on','note'],
};
export type Query = { table: string; action: string; columns?: string; values?: Record<string, unknown>; filters?: {column:string;op:string;value:unknown}[]; orders?: {column:string;ascending:boolean}[]; offset?:number; limit?:number; single?:boolean };
const fail = (status:number,message:string):never => {throw Object.assign(new Error(message),{status});};
const q = (s:string) => `"${s}"`;
export async function executeQuery(db: PoolClient, input:Query, admin:boolean) {
  const { table, action } = input;
  if (!Object.hasOwn(readable,table) || !['select','insert','update','delete'].includes(action)) fail(400,'Consulta inválida.');
  if (!admin && (['bookings','booking_payments'].includes(table) ? !(table==='bookings' && action==='insert') : action!=='select')) fail(403,'Acesso restrito à administradora.');
  if (action!=='select' && (!writable[table] || (table==='booking_payments' && action!=='insert') || (table==='bookings' && action==='delete'))) fail(403,'Operação não permitida.');
  const columns=input.columns==='*' || !input.columns ? readable[table] : input.columns.split(',').map(s=>s.trim());
  if (!columns.length || columns.some(c=>!readable[table].includes(c))) fail(400,'Campos inválidos.');
  const values:unknown[]=[];
  const param=(value:unknown)=>{values.push(value);return '$'+values.length;};
  const checkColumn=(c:string)=>{if(!readable[table].includes(c))fail(400,'Filtro inválido.');return q(c);};
  if ((input.filters?.length||0)>12 || (input.orders?.length||0)>4) fail(400,'Consulta inválida.');
  const where=(input.filters||[]).map(f=>{
    const column=checkColumn(f.column);
    if(f.op==='in') {
      if(!Array.isArray(f.value)||f.value.length<1||f.value.length>50)fail(400,'Filtro inválido.');
      return `${column} IN (${(f.value as unknown[]).map(param).join(',')})`;
    }
    const ops:Record<string,string>={eq:'=',gte:'>=',lte:'<=',lt:'<'};
    if(!Object.hasOwn(ops,f.op))fail(400,'Filtro inválido.');
    return column+ops[f.op]+param(f.value);
  });
  let sql='';
  if(action==='select') {
    sql=`SELECT ${columns.map(q).join(',')} FROM public.${q(table)}`;
  } else if(action==='insert'||action==='update') {
    if(!input.values || Array.isArray(input.values))fail(400,'Dados inválidos.');
    const keys=Object.keys(input.values);
    const allowed = !admin && table==='bookings' ? ['id','service_id','service_name','price','date','time','client_name','client_phone'] : writable[table];
    if(!keys.length||keys.some(k=>!allowed.includes(k)))fail(403,'Campos não permitidos.');
    if(action==='update' && keys.includes('id'))fail(400,'Identificador imutável.');
    sql=action==='insert' ? `INSERT INTO public.${q(table)} (${keys.map(q).join(',')}) VALUES (${keys.map(k=>param(input.values![k])).join(',')})` : `UPDATE public.${q(table)} SET ${keys.map(k=>q(k)+'='+param(input.values![k])).join(',')}`;
  } else sql=`DELETE FROM public.${q(table)}`;
  if(action==='update'||action==='delete') {
    if(!input.filters?.some(f=>f.column==='id'&&f.op==='eq'&&typeof f.value==='string'&&f.value.length))fail(400,'Informe o registro a alterar.');
  }
  if(action!=='insert' && where.length)sql+=' WHERE '+where.join(' AND ');
  if(action==='select') {
    if(input.orders?.length)sql+=' ORDER BY '+input.orders.map(o=>checkColumn(o.column)+(o.ascending===false?' DESC':' ASC')).join(',');
    const limit=input.limit??500,offset=input.offset??0;
    if(!Number.isInteger(limit)||limit<1||limit>500||!Number.isInteger(offset)||offset<0||offset>100000)fail(400,'Paginação inválida.');
    sql+=` LIMIT ${param(limit)} OFFSET ${param(offset)}`;
  } else if(input.columns && admin)sql+=' RETURNING '+columns.map(q).join(',');
  const result=await db.query(sql,values);
  if(input.single && admin && result.rows.length!==1)fail(404,'Registro não encontrado.');
  return action!=='select' && (!admin||!input.columns) ? null : input.single ? result.rows[0] : result.rows;
}
