import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getApiUrl, validateEnv } from './env';

describe('getApiUrl', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns NEXT_PUBLIC_API_URL when explicitly set', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.dupdap.io/v1';
    expect(getApiUrl()).toBe('https://api.dupdap.io/v1');
  });

  it('falls back to local development URL when NEXT_PUBLIC_API_URL is unset in development', () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    (process.env as Record<string, string>).NODE_ENV = 'development';
    expect(getApiUrl()).toBe('http://localhost:3000/api/v1');
  });

  it('falls back to local development URL when NEXT_PUBLIC_API_URL is unset in test', () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    (process.env as Record<string, string>).NODE_ENV = 'test';
    expect(getApiUrl()).toBe('http://localhost:3000/api/v1');
  });

  it('throws an error in production when NEXT_PUBLIC_API_URL is not configured', () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    (process.env as Record<string, string>).NODE_ENV = 'production';
    expect(() => getApiUrl()).toThrow('NEXT_PUBLIC_API_URL is not configured');
  });
});

describe('validateEnv (#803)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws in production when NEXT_PUBLIC_API_URL is unset', () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    (process.env as Record<string, string>).NODE_ENV = 'production';
    expect(() => validateEnv()).toThrow(
      'Missing required environment variable(s): NEXT_PUBLIC_API_URL'
    );
  });

  it('passes in production when required variables are set', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.dupdap.io/v1';
    (process.env as Record<string, string>).NODE_ENV = 'production';
    expect(() => validateEnv()).not.toThrow();
  });

  it('does not throw outside production', () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    (process.env as Record<string, string>).NODE_ENV = 'development';
    expect(() => validateEnv()).not.toThrow();
  });
});
