import type { Router } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext, type TestContext } from './helpers.js';

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(async () => ctx.close());

interface Layer {
  route?: { path: string; methods: Record<string, boolean> };
}

/** Every route actually registered on the API router, as "METHOD /api/v1/path/{param}". */
function registeredRoutes(context: TestContext = ctx): string[] {
  const router = context.app.locals.apiRouter as Router & { stack: Layer[] };
  const routes: string[] = [];
  for (const layer of router.stack) {
    if (!layer.route) continue;
    const path = '/api/v1' + layer.route.path.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
    for (const [method, enabled] of Object.entries(layer.route.methods)) {
      if (enabled && method !== '_all') routes.push(`${method.toUpperCase()} ${path}`);
    }
  }
  return routes.sort();
}

describe('OpenAPI', () => {
  it('serves the spec and Swagger UI', async () => {
    const spec = await request(ctx.app).get('/docs/openapi.json');
    expect(spec.status).toBe(200);
    expect(spec.body.openapi).toBe('3.1.0');
    const ui = await request(ctx.app).get('/docs/');
    expect(ui.status).toBe(200);
    expect(ui.text).toContain('swagger-ui');
  });

  async function documentedRoutes(context: TestContext): Promise<string[]> {
    const spec = (await request(context.app).get('/docs/openapi.json')).body as {
      paths: Record<string, Record<string, unknown>>;
    };
    const documented: string[] = [];
    for (const [path, ops] of Object.entries(spec.paths)) {
      for (const method of Object.keys(ops)) documented.push(`${method.toUpperCase()} ${path}`);
    }
    return documented;
  }

  it('documents every registered route, and nothing that does not exist', async () => {
    const documented = await documentedRoutes(ctx);
    const registered = registeredRoutes();
    expect(registered.length).toBeGreaterThan(40);
    expect(registered.filter((r) => !documented.includes(r))).toEqual([]);
    expect(documented.filter((d) => !registered.includes(d))).toEqual([]);
  });

  it('in demo mode the dev routes are registered AND documented (and only there)', async () => {
    const demo = await createTestContext({ paymentsProvider: 'fake' });
    try {
      const documented = await documentedRoutes(demo);
      const registered = registeredRoutes(demo);
      expect(registered).toContain('POST /api/v1/dev/orders/{id}/simulate-payment');
      expect(registered.filter((r) => !documented.includes(r))).toEqual([]);
      expect(documented.filter((d) => !registered.includes(d))).toEqual([]);
      expect(registeredRoutes()).not.toContain('POST /api/v1/dev/orders/{id}/simulate-payment');
    } finally {
      await demo.close();
    }
  });

  it('documents error responses with examples for every operation', async () => {
    const spec = (await request(ctx.app).get('/docs/openapi.json')).body as {
      paths: Record<
        string,
        Record<
          string,
          { responses: Record<string, { content?: Record<string, { examples?: object }> }> }
        >
      >;
    };
    for (const [path, ops] of Object.entries(spec.paths)) {
      for (const [method, op] of Object.entries(ops)) {
        const errorStatuses = Object.keys(op.responses).filter((s) => Number(s) >= 400);
        expect(errorStatuses, `${method} ${path}`).toContain('500');
        for (const status of errorStatuses) {
          const examples = op.responses[status]!.content?.['application/json']?.examples;
          expect(examples, `${method} ${path} ${status}`).toBeDefined();
        }
      }
    }
  });
});
