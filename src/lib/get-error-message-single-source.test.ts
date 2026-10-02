/**
 * Issue #359: `src/lib/utils.ts` used to export a second, differently-shaped
 * `getErrorMessage(err, fallback)` alongside the app-wide
 * `getErrorMessage(err)` in `src/lib/errors.ts`. The two were not
 * interchangeable, and the utils.ts variant was dead code.
 *
 * These tests lock in a single source of truth:
 *   - only `errors.ts` exports `getErrorMessage`
 *   - no other src file imports it from `utils.ts`
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import * as utils from './utils';
import * as errors from './errors';

const SRC_ROOT = path.resolve(__dirname, '..');

/** Recursively collect every .ts/.tsx file under src/. */
function collectSourceFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
    } else if (/\.tsx?$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('getErrorMessage has a single source (#359)', () => {
  it('is exported by src/lib/errors.ts', () => {
    expect(typeof errors.getErrorMessage).toBe('function');
  });

  it('is NOT exported by src/lib/utils.ts', () => {
    expect('getErrorMessage' in utils).toBe(false);
  });

  it('is never imported from utils.ts anywhere in src/', () => {
    const offenders = collectSourceFiles(SRC_ROOT)
      .filter((file) => file !== path.join(SRC_ROOT, 'lib', 'errors.ts'))
      .filter((file) =>
        /getErrorMessage[^;]*from\s+['"][^'"]*utils['"]/.test(fs.readFileSync(file, 'utf8')),
      )
      .map((file) => path.relative(SRC_ROOT, file));

    expect(offenders).toEqual([]);
  });
});
