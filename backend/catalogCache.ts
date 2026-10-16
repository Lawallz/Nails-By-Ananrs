// Public catalog only. Never store availability, sessions or customer records here.
const entries = new Map<string, { value: unknown; expires: number }>();
const TTL = 30_000;
const MAX_ENTRIES = 16;
export function catalogKey(input: { action?: string; table?: string }, authenticated: boolean) {
  return !authenticated && input.action === 'select' &&
    (input.table === 'services' || input.table === 'ai_color_catalog') ? JSON.stringify(input) : null;
}
export function cachedCatalog(key: string | null) {
  if (!key) return undefined;
  const entry = entries.get(key);
  if (entry && entry.expires > Date.now()) return entry.value;
  entries.delete(key);
  return undefined;
}
export function storeCatalog(key: string | null, value: unknown) {
  if (!key || Buffer.byteLength(JSON.stringify(value)) > 65536) return;
  if (entries.size >= MAX_ENTRIES) entries.delete(entries.keys().next().value!);
  entries.set(key, { value, expires: Date.now() + TTL });
}
export function clearCatalog() { entries.clear(); }
