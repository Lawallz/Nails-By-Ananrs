import { createRemoteJWKSet, jwtVerify } from 'jose';
import { pool } from './database.js';
let jwks: ReturnType<typeof createRemoteJWKSet>;
export async function identity(req: Request) {
  const authorization = req.headers.get('authorization');
  if (!authorization) return null;
  const base = process.env.NEON_AUTH_BASE_URL || process.env.VITE_NEON_AUTH_URL;
  if (!base || !authorization.startsWith('Bearer ')) throw Object.assign(new Error('Sessão inválida.'), { status: 401 });
  try {
    jwks ||= createRemoteJWKSet(new URL(`${base.replace(/\/$/, '')}/.well-known/jwks.json`));
    const { payload } = await jwtVerify(authorization.slice(7), jwks, { algorithms: ['EdDSA'], issuer: new URL(base).origin, audience: new URL(base).origin });
    if (!payload.sub || payload.banned) throw new Error('Invalid identity');
    const result = await pool.query('SELECT user_id FROM private.admin_users WHERE user_id=$1', [payload.sub]);
    return { id: payload.sub, admin: result.rowCount === 1 };
  } catch { throw Object.assign(new Error('Sessão inválida ou expirada. Entre novamente.'), { status: 401 }); }
}
