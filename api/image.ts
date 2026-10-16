import { serviceImageType } from '../backend/imageFormat.js';
import { readBody } from '../backend/http.js';
import { pool } from '../backend/database.js';
import { identity } from '../backend/identity.js';
export async function fetch(req:Request) {
  try {
    if(req.method==='GET') {
      const id=new URL(req.url).searchParams.get('id');
      if(!/^[a-f0-9-]{36}$/i.test(id||''))return new Response(null,{status:404});
      const {rows}=await pool.query('SELECT content FROM private.service_images WHERE id=$1',[id]);
      if(!rows[0])return new Response(null,{status:404});
      const contentType=serviceImageType(rows[0].content);
      if(!contentType)return new Response(null,{status:404});
      return new Response(rows[0].content,{headers:{'Content-Type':contentType,'Cache-Control':'public, max-age=86400','Vercel-CDN-Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'}});
    }
    if(req.method!=='POST')return new Response(null,{status:405});
    if(!(await identity(req))?.admin)return new Response(null,{status:403});
    if(Number(req.headers.get('content-length'))>800000)return new Response(null,{status:413});
    const bytes=Buffer.from(await readBody(req,800000));
    if(!serviceImageType(bytes))return Response.json({error:'Foto inválida.'},{status:400});
    const {rows}=await pool.query('INSERT INTO private.service_images(content) VALUES($1) RETURNING id',[bytes]);
    return Response.json({url:`/api/image?id=${rows[0].id}`},{headers:{'Cache-Control':'no-store'}});
  } catch(e:any){return Response.json({error:'Não foi possível carregar a foto.'},{status:e.status||500});}
}
