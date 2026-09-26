import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const validatorPath = resolve(process.cwd(), 'scripts/validate-env.mjs');

function runValidator(nodeEnv: string, apiUrl?: string) {
  const env = { ...process.env, NODE_ENV: nodeEnv };
  if (apiUrl === undefined) {
    delete env.NEXT_PUBLIC_API_URL;
  } else {
    env.NEXT_PUBLIC_API_URL = apiUrl;
  }

  return spawnSync(process.execPath, [validatorPath], { env, encoding: 'utf8' });
}

describe('validate-env script', () => {
  it.each([
    ['HTTP localhost', 'http://localhost:3000/api/v1'],
    ['HTTPS API', 'https://api.example.com/api/v1'],
  ])('accepts a valid production %s URL', (_name, apiUrl) => {
    const result = runValidator('production', apiUrl);

    expect(result.status).toBe(0);
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
  ] as const)('rejects a production URL that is %s', (_name, apiUrl) => {
    const result = runValidator('production', apiUrl);

    expect(result.status).not.toBe(0);
  });

  it('rejects a malformed production URL', () => {
    const result = runValidator('production', 'not a url');

    expect(result.status).not.toBe(0);
  });

  it('rejects non-HTTP(S) production URLs', () => {
    const result = runValidator('production', 'ftp://api.example.com');

    expect(result.status).not.toBe(0);
  });

  it('allows a missing URL in non-production environments', () => {
    const result = runValidator('development');

    expect(result.status).toBe(0);
  });

  it('does not validate URL syntax outside production', () => {
    const result = runValidator('development', 'not a url');

    expect(result.status).toBe(0);
  });
});
