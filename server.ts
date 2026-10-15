import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import data from './api/data.js';
import image from './api/image.js';
import auth from './api/auth/[...path].js';
import consult from './api/consult.js';
const app=express();
app.use('/api',express.raw({type:()=>true,limit:'900kb'}));
function bridge(handler:(request:Request)=>Promise<Response>) {
  return async (req:express.Request,res:express.Response)=>{
    try {
      const headers=new Headers();
      for(const [key,value] of Object.entries(req.headers))if(value)headers.set(key,Array.isArray(value)?value.join(','):value);
      const request=new Request(`http://${req.headers.host}${req.originalUrl}`,{method:req.method,headers,...(['GET','HEAD'].includes(req.method)?{}:{body:req.body})});
      const result=await handler(request);
      res.status(result.status);
      result.headers.forEach((v,k)=>{if(k!=='set-cookie')res.setHeader(k,v);});
      if(result.headers.getSetCookie().length)res.setHeader('Set-Cookie',result.headers.getSetCookie());
      res.send(Buffer.from(await result.arrayBuffer()));
    }catch{res.status(500).json({error:'Erro no servidor.'});}
  };
}
app.all('/api/data',bridge(data));
app.all('/api/image',bridge(image));
app.all('/api/auth/*',bridge(auth));
app.all('/api/consult',bridge(consult));
async function start() {
if(process.env.NODE_ENV!=='production') {
  const vite=await createViteServer({server:{middlewareMode:true},appType:'spa'});
  app.use(vite.middlewares);
}else{
  app.use(express.static(path.join(process.cwd(),'dist')));
  app.get('*',(_req,res)=>res.sendFile(path.join(process.cwd(),'dist/index.html')));
}
app.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('Nails server ready'));

}
void start();
