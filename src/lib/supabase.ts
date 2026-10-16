// Compatibility facade for the existing calendar. All data now uses our Vercel API + Neon.
import { createAuthClient } from '@neondatabase/auth';
import { SupabaseAuthAdapter } from '@neondatabase/auth/vanilla/adapters';
export const auth=createAuthClient(`${window.location.origin}/api/auth`, {adapter:SupabaseAuthAdapter()});
let pendingAuthorization: Promise<Record<string,string>> | undefined;
export function authorizationHeaders(): Promise<Record<string,string>> {
  // Share concurrent requests only; no persistent JWT cache or localStorage.
  return pendingAuthorization ??= loadAuthorizationHeaders().finally(() => { pendingAuthorization=undefined; });
}
async function loadAuthorizationHeaders(): Promise<Record<string,string>> {
  const {data:{session}}=await auth.getSession();
  if (!session) return {};
  // Use the same-origin proxy so the session cookie accompanies the JWT request.
  const response=await fetch('/api/auth/token',{
    method:'GET',credentials:'same-origin',cache:'no-store',
  });
  const data=await response.json();
  if(!response.ok||typeof data?.token!=='string'||!data.token)throw new Error('Sessão expirada. Entre novamente.');
  return {Authorization:`Bearer ${data.token}`};
}
export async function isAdmin() {
  const response=await fetch('/api/data',{method:'POST',headers:{'Content-Type':'application/json',...await authorizationHeaders()},body:JSON.stringify({action:'session'})});
  const result=await response.json();
  if(result.error)throw result.error;
  return !!result.data?.admin;
}
type Result={data:any;error:any;status:number};
class Query implements PromiseLike<Result> {
  private input:any;
  private signal?:AbortSignal;
  constructor(table:string){this.input={table,action:'select',filters:[],orders:[]};}
  select(columns='*'){this.input.columns=columns;return this;}
  insert(values:unknown){this.input.action='insert';this.input.values=values;return this;}
  update(values:unknown){this.input.action='update';this.input.values=values;return this;}
  delete(){this.input.action='delete';return this;}
  private filter(column:string,op:string,value:unknown){this.input.filters.push({column,op,value});return this;}
  eq(c:string,v:unknown){return this.filter(c,'eq',v);}
  gte(c:string,v:unknown){return this.filter(c,'gte',v);}
  lte(c:string,v:unknown){return this.filter(c,'lte',v);}
  lt(c:string,v:unknown){return this.filter(c,'lt',v);}
  in(c:string,v:unknown[]){return this.filter(c,'in',v);}
  order(column:string,options:{ascending?:boolean}={}){this.input.orders.push({column,ascending:options.ascending!==false});return this;}
  range(start:number,end:number){this.input.offset=start;this.input.limit=end-start+1;return this;}
  single(){this.input.single=true;return this;}
  abortSignal(signal:AbortSignal){this.signal=signal;return this;}
  private async run():Promise<Result>{
    try {
      const headers=window.location.pathname.startsWith('/gestao-ananrs')?await authorizationHeaders():{};
      const response=await fetch('/api/data',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(this.input),signal:this.signal});
      return {...await response.json(),status:response.status};
    } catch(e:any){return {data:null,error:{message:e.name==='AbortError'?'Consulta cancelada.':'Não foi possível conectar. Tente novamente.',name:e.name},status:0};}
  }
  then<T=Result,U=never>(resolve?:((r:Result)=>T|PromiseLike<T>)|null,reject?:((e:any)=>U|PromiseLike<U>)|null):Promise<T|U>{return this.run().then(resolve,reject);}
}
export const supabase={auth,from:(table:string)=>new Query(table)};
