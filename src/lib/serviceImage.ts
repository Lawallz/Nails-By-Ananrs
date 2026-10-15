import { authorizationHeaders } from './supabase';
export async function uploadServiceImage(file:File) {
  const bitmap=await createImageBitmap(file);
  const canvas=document.createElement('canvas');
  const ratio=Math.min(1,1200/Math.max(bitmap.width,bitmap.height));
  canvas.width=Math.round(bitmap.width*ratio);canvas.height=Math.round(bitmap.height*ratio);
  canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Não foi possível preparar a foto.')),'image/webp',0.8));
  if(blob.size>800000)throw new Error('Escolha uma foto menor.');
  const response=await fetch('/api/image',{method:'POST',headers:{'Content-Type':'image/webp',...await authorizationHeaders()},body:blob});
  const result=await response.json();
  if(!response.ok)throw new Error(result.error||'Não foi possível enviar a foto.');
  return result.url as string;
}
