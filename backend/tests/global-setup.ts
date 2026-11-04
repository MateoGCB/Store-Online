import { execSync } from 'node:child_process';
import { config as loadDotenv } from 'dotenv';
import pg from 'pg';
import { assertTestDatabase } from '../src/config/env.js';

/**
 * Runs once before the whole suite: refuses anything that is not a *_test database,
 * creates it if needed and applies the migrations.
 */
export default async function setup() {
  loadDotenv({ quiet: true });
  const url = process.env.DATABASE_URL_TEST;
  assertTestDatabase(url);

  const target = new URL(url!);
  const dbName = decodeURIComponent(target.pathname.slice(1));
  const admin = new URL(url!);
  admin.pathname = '/postgres';
  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (exists.rowCount === 0) {
      await client.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
    }
  } finally {
    await client.end();
  }

  execSync('npx prisma migrate deploy', {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: url },
  });
}
