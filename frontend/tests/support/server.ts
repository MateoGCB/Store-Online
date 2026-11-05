import { setupServer } from 'msw/node';

/** Mock API used by component tests. Each test registers its own handlers. */
export const server = setupServer();
export const API = 'http://localhost:3000/api/v1';
