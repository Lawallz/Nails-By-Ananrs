import { handleAuthProxyRequest } from '@neondatabase/auth/server';
export async function fetch(request:Request) {
  const baseUrl=process.env.NEON_AUTH_BASE_URL || process.env.VITE_NEON_AUTH_URL;
  const cookieSecret=process.env.NEON_AUTH_COOKIE_SECRET;
  if(!baseUrl||!cookieSecret)return Response.json({message:'Acesso temporariamente indisponível.'},{status:503});
  const url=new URL(request.url);
  const path=url.searchParams.get('path') || url.pathname.replace(/^\/api\/auth\//,'');
  if(!/^[a-zA-Z0-9/_-]+$/.test(path)||!['GET','POST'].includes(request.method))return new Response(null,{status:400});
  // Managed auth validates credentials and origins; the SDK keeps cookies on our own domain.
  const response=await handleAuthProxyRequest({request,path,baseUrl,cookieSecret,sameSite:'lax'});
  response.headers.set('Cache-Control','private, no-store');
  return response;
}
