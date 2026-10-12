
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { StorageDriver } from './deployment.repository.ts';

export class FileStorageDriver implements StorageDriver {
  private readonly filePath: string;

  constructor(filePath = './data/changeguard-deployments.json') {
    this.filePath = resolve(filePath);

    const directory = dirname(this.filePath);
    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
    }
  }

  read(key: string): string | null {
    try {
      if (!existsSync(this.filePath)) return null;

      const data = JSON.parse(readFileSync(this.filePath, 'utf8')) as Record<string, string>;
      return data[key] ?? null;
    } catch {
      return null;
    }
  }

  write(key: string, value: string): void {
    let data: Record<string, string> = {};

    try {
      if (existsSync(this.filePath)) {
        data = JSON.parse(readFileSync(this.filePath, 'utf8')) as Record<string, string>;
      }
    } catch {
      data = {};
    }

    data[key] = value;
    writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  remove(key: string): void {
    try {
      if (!existsSync(this.filePath)) return;

      const data = JSON.parse(readFileSync(this.filePath, 'utf8')) as Record<string, string>;
      delete data[key];
      writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch {
      // Leave storage unchanged if the file cannot be read or written.
    }
  }
}
