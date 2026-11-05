/**
 * `npm run e2e`: prepares a DEDICATED database (name must end in _test), migrates and seeds
 * it, builds the store and runs Playwright, which starts the API (simulated payments) and
 * the store on their own ports. It never touches the development database.
 */
import { execSync, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backend = path.resolve(frontend, '../backend');

function readEnvFile(file) {
  const values = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (match) values[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return values;
}

const backendEnv = readEnvFile(path.join(backend, '.env'));
const base = new URL(process.env.E2E_DATABASE_URL ?? backendEnv.DATABASE_URL_TEST ?? '');
base.pathname = '/store_e2e_test';
const databaseUrl = base.toString();
const dbName = decodeURIComponent(base.pathname.slice(1));
if (!dbName.endsWith('_test')) {
  console.error(`Refusing to run e2e against "${dbName}": the name must end in _test.`);
  process.exit(1);
}

const API_PORT = 4100;
const WEB_PORT = 3100;
const uploadDir = mkdtempSync(path.join(tmpdir(), 'store-e2e-uploads-'));
const adminEmail = 'admin-e2e@example.com';
const adminPassword = `E2e-${randomBytes(9).toString('base64url')}1`;

const env = {
  ...process.env,
  E2E_DATABASE_URL: databaseUrl,
  E2E_UPLOAD_DIR: uploadDir,
  E2E_API_PORT: String(API_PORT),
  E2E_WEB_PORT: String(WEB_PORT),
  E2E_ADMIN_EMAIL: adminEmail,
  E2E_ADMIN_PASSWORD: adminPassword,
};

function step(title, fn) {
  console.log(`\n▶ ${title}`);
  fn();
}

const run = (command, cwd, extraEnv = {}) =>
  execSync(command, { cwd, stdio: 'inherit', env: { ...env, ...extraEnv } });

// 1. Fresh database (dropped and created again on every run).
step(`Database ${dbName}`, () => {
  const require = createRequire(path.join(backend, 'package.json'));
  const script = `
    const { Client } = require(${JSON.stringify(require.resolve('pg'))});
    (async () => {
      const admin = new URL(${JSON.stringify(databaseUrl)}); admin.pathname = '/postgres';
      const c = new Client({ connectionString: admin.toString() });
      await c.connect();
      await c.query('DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)');
      await c.query('CREATE DATABASE "${dbName}"');
      await c.end();
    })().catch((e) => { console.error(e); process.exit(1); });`;
  const result = spawnSync(process.execPath, ['-e', script], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(1);
});

// 2. Migrations + seed (admin user, categories, products with images).
step('Migrations and seed', () => {
  const seedEnv = {
    DATABASE_URL: databaseUrl,
    UPLOAD_DIR: uploadDir,
    PUBLIC_API_URL: `http://localhost:${API_PORT}`,
    ADMIN_EMAIL: adminEmail,
    ADMIN_PASSWORD: adminPassword,
    DOTENV_CONFIG_QUIET: 'true',
  };
  run('npx prisma migrate deploy', backend, seedEnv);
  run('npm run db:seed', backend, seedEnv);
});

// 3. Production build of the store pointing at the e2e API.
step('Build', () => run('npx next build', frontend, { API_URL: `http://localhost:${API_PORT}` }));

// 4. Playwright (starts both servers, see playwright.config.ts).
let status = 0;
step('Playwright', () => {
  const extra = process.argv.slice(2).join(' ');
  try {
    run(`npx playwright test ${extra}`.trim(), frontend);
  } catch {
    status = 1;
  }
});

rmSync(uploadDir, { recursive: true, force: true });
process.exit(status);
