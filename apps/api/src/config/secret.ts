import { readFileSync } from 'node:fs';

export function readSecret(name: string): string | undefined {
  const filePath = process.env[`${name}_FILE`];
  if (filePath) {
    try {
      return readFileSync(filePath, 'utf8').trim();
    } catch {
      return undefined;
    }
  }
  return process.env[name];
}
