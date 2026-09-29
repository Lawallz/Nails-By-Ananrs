import { createClient } from 'npm:@supabase/supabase-js@2.112.0';
import { createHandler } from '../_shared/service-handler.ts';
const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{
  auth:{persistSession:false,autoRefreshToken:false}
});
Deno.serve(createHandler({
  env:key=>Deno.env.get(key),
  rpc:async(name,args)=>{const {data,error}=await client.rpc(name,args);return {data,error};},
  services:async()=>{const {data,error}=await client.from('services').select('id,name').limit(100);return {data,error};},
  fetch:globalThis.fetch
}));
