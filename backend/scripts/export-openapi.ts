/**
 * Prints the OpenAPI spec as JSON (used by the frontend to generate its API types).
 * It includes the demo-mode routes so the frontend can type its development pages.
 * Usage: npm run --silent openapi:export > openapi.json
 */
import { buildOpenApiDocument } from '../src/openapi/document.js';

const document = buildOpenApiDocument({
  PUBLIC_API_URL: 'http://localhost:4000',
  PAYMENTS_PROVIDER: 'fake',
});
process.stdout.write(`${JSON.stringify(document, null, 2)}\n`);
