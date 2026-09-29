import { supabase } from './supabase';
export async function callServerService<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('nails-services', { body });
  if (error) {
    let message = 'Serviço temporariamente indisponível. Tente mais tarde.';
    if (error.context instanceof Response) {
      const response = error.context;
      const payload = await response.json().catch(() => null);
      if (typeof payload?.error === 'string') message = payload.error;
    }
    throw new Error(message);
  }
  return data as T;
}
