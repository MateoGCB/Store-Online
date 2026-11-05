/**
 * Generates src/lib/api/schema.d.ts from the backend OpenAPI spec (no running API needed:
 * the backend prints its spec with `npm run openapi:export`).
 *
 *   node scripts/generate-api-types.mjs          regenerate the file
 *   node scripts/generate-api-types.mjs --check  fail if the committed file is outdated
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import openapiTS, { astToString } from 'openapi-typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backend = path.resolve(root, '../backend');
const target = path.join(root, 'src/lib/api/schema.d.ts');

const json = execSync('npm run --silent openapi:export', {
  cwd: backend,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
});
const spec = JSON.parse(json);

const header =
  '/**\n * Generated from the backend OpenAPI spec by `npm run api:types`. Do not edit by hand.\n */\n\n';
const contents = header + astToString(await openapiTS(spec));

if (process.argv.includes('--check')) {
  let current = '';
  try {
    current = readFileSync(target, 'utf8').replace(/\r\n/g, '\n');
  } catch {
    // missing file counts as outdated
  }
  if (current !== contents) {
    console.error('src/lib/api/schema.d.ts is outdated: run `npm run api:types`.');
    process.exit(1);
  }
  console.log('API types are up to date.');
} else {
  writeFileSync(target, contents);
  console.log(`Wrote ${path.relative(root, target)}`);
}
