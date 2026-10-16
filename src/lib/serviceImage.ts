import { prepareServiceImage } from './prepareServiceImage';
import { authorizationHeaders } from './supabase';
export async function uploadServiceImage(file:File) {
  const blob=await prepareServiceImage(file);
  const response=await fetch('/api/image',{method:'POST',headers:{'Content-Type':blob.type,...await authorizationHeaders()},body:blob});
  const result=await response.json();
  if(!response.ok)throw new Error(result.error||'Não foi possível enviar a foto.');
  return result.url as string;
}
