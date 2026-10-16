// Bound streamed bodies even when Content-Length is missing or dishonest.
export async function readBody(req: Request, maximum: number): Promise<Uint8Array> {
  const tooLarge = () => Object.assign(new Error('Dados muito grandes.'), { status: 413 });
  if (Number(req.headers.get('content-length')) > maximum) throw tooLarge();
  const reader = req.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) { await reader.cancel(); throw tooLarge(); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return body;
}
export async function readJson(req: Request, maximum = 32768) {
  const value = JSON.parse(new TextDecoder().decode(await readBody(req, maximum)));
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw Object.assign(new Error('Dados inválidos.'), { status: 400 });
  }
  return value;
}
