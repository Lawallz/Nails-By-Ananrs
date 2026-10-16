import pg from 'pg';
import { attachDatabasePool } from '@vercel/functions';
pg.types.setTypeParser(1700, Number);
pg.types.setTypeParser(1082, value => value);
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3, connectionTimeoutMillis: 10000, idleTimeoutMillis: 10000, statement_timeout: 8000, lock_timeout: 3000, idle_in_transaction_session_timeout: 10000 });
attachDatabasePool(pool);

// Idle connection failures must not crash the function process or expose credentials.
pool.on('error', () => console.error('Idle database connection failed'));
