import { describe, it, expect, beforeEach } from 'vitest';

import { resolveTheme } from './themeStore';

describe('resolveTheme', () => {
  it('returns light when theme is light regardless of system preference', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('light', false)).toBe('light');
  });

  it('returns dark when theme is dark regardless of system preference', () => {
    expect(resolveTheme('dark', true)).toBe('dark');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('returns dark when theme is system and system prefers dark', () => {
    expect(resolveTheme('system', true)).toBe('dark');
  });

  it('returns light when theme is system and system prefers light', () => {
    expect(resolveTheme('system', false)).toBe('light');
  });
});
