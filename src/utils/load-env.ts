import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function loadEnvFromFile(envFilePath = join(process.cwd(), '.env')): void {
  if (!existsSync(envFilePath)) return;

  const content = readFileSync(envFilePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eqIndex = line.indexOf('=');
    if (eqIndex < 1) continue;

    const key = line.slice(0, eqIndex).trim();
    const value = stripQuotes(line.slice(eqIndex + 1));
    if (!key) continue;

    // Don't override values already set by the process environment.
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

