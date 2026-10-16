import { readJson } from '../backend/http.js';
import { catalogKey, cachedCatalog, storeCatalog, clearCatalog } from '../backend/catalogCache.js';
import { isIP } from 'node:net';
import { pool } from '../backend/database.js';
import { identity } from '../backend/identity.js';
import { executeQuery } from '../backend/query.js';
export async function fetch(req: Request) {
  const headers={'Cache-Control':'private, no-store'};
  if(req.method!=='POST')return Response.json({error:{message:'Método inválido.'}},{status:405,headers});
  let db;
  try {
    const input=await readJson(req);
    const user=await identity(req);
    if(input.action==='session')return Response.json({data:{admin:!!user?.admin},error:null},{headers});
    // Vercel overwrites this header. Never trust the client-supplied CF/XFF headers.
    const ip=process.env.VERCEL ? req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() : '127.0.0.1';
    if(input.table==='bookings'&&input.action==='insert'&&!user?.admin&&!isIP(ip||''))throw Object.assign(new Error('Não foi possível validar a origem.'),{status:400});
    const key=catalogKey(input,!!user);
    const cached=cachedCatalog(key);
    if(cached!==undefined)return Response.json({data:cached,error:null},{headers});
    db=await pool.connect();
    await db.query('BEGIN');
    await db.query("SELECT set_config('request.jwt.claims',$1,true), set_config('request.headers',$2,true), set_config('statement_timeout','8000',true)", [JSON.stringify({sub:user?.id,role:user?'authenticated':'anon'}),JSON.stringify({'cf-connecting-ip':ip})]);
    const data=await executeQuery(db,input,!!user?.admin);
    await db.query('COMMIT');
    if(input.action!=='select' && ['services','ai_color_catalog'].includes(input.table))clearCatalog();
    storeCatalog(key,data);
    return Response.json({data,error:null},{headers});
  } catch(e:any) {
    if(db)await db.query('ROLLBACK').catch(()=>{});
    const status=e.status || (/^PT\d{3}$/.test(e.code||'')?Number(e.code.slice(2)):e.code==='23505'?409:e instanceof SyntaxError?400:500);
    if(status===500)console.error('Database request failed',e.code||e.name);
    return Response.json({data:null,error:{message:status===500?'Não foi possível concluir. Tente novamente.':e.message,code:e.code||String(status)}},{status,headers});
  } finally {db?.release();}
}
