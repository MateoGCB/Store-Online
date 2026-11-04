import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { StorageProvider } from './storage-provider.js';

const SAFE_KEY = /^[a-z0-9-]+(\/[a-z0-9-]+)*\.[a-z0-9]+$/;

/** Stores files on the local disk under `rootDir`; they are served by the API at `/uploads`. */
export class LocalStorage implements StorageProvider {
  readonly rootDir: string;

  constructor(
    rootDir: string,
    private readonly publicBaseUrl: string,
  ) {
    this.rootDir = path.resolve(rootDir);
  }

  private resolve(key: string): string {
    if (!SAFE_KEY.test(key)) throw new Error(`Invalid storage key: ${key}`);
    const full = path.resolve(this.rootDir, key);
    if (!full.startsWith(this.rootDir + path.sep)) throw new Error('Storage key escapes root');
    return full;
  }

  async save(key: string, data: Buffer, _contentType?: string): Promise<void> {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data, { flag: 'wx' });
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }

  publicUrl(key: string): string {
    return `${this.publicBaseUrl.replace(/\/+$/, '')}/uploads/${key}`;
  }
}
