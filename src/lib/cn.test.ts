import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn()', () => {
  it('returns an empty string when called with no arguments', () => {
    expect(cn()).toBe('');
  });

  it('passes through a single class name unchanged', () => {
    expect(cn('text-gray-600')).toBe('text-gray-600');
  });

  it('joins multiple class names with a space', () => {
    expect(cn('flex', 'items-center', 'gap-2')).toBe('flex items-center gap-2');
  });

  it('ignores falsy values (false, null, undefined, empty string)', () => {
    expect(cn('px-4', false, null, undefined, '', 'py-2')).toBe('px-4 py-2');
  });

  it('includes the conditional class when the condition is truthy', () => {
    const active = true;
    // Both are text-color utilities — twMerge resolves the conflict; active class wins.
    const result = cn('text-gray-600', active && 'text-brand-700');
    expect(result).toContain('text-brand-700');
  });

  it('excludes a class from a falsy conditional', () => {
    const active = false;
    expect(cn('text-gray-600', active && 'text-brand-700')).toBe('text-gray-600');
  });

  it('resolves conflicting Tailwind text-color classes — last one wins', () => {
    // twMerge deduplicates by Tailwind utility group; the later class should win.
    expect(cn('text-gray-600', 'text-brand-700')).toBe('text-brand-700');
  });

  it('resolves conflicting padding classes — last one wins', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });

  it('resolves conflicting bg-color classes — later class wins', () => {
    expect(cn('bg-white', 'bg-gray-100')).toBe('bg-gray-100');
  });

  it('merges active-nav-item pattern correctly (text-gray-600 overridden by text-brand-700)', () => {
    // Mirrors the active navigation item logic in dashboard/layout.tsx.
    function navClass(active: boolean) {
      return cn('text-gray-600 flex items-center gap-2', active && 'text-brand-700 bg-brand-50');
    }

    expect(navClass(false)).toBe('text-gray-600 flex items-center gap-2');
    expect(navClass(true)).toBe('flex items-center gap-2 text-brand-700 bg-brand-50');
  });

  it('handles object syntax from clsx', () => {
    expect(cn({ 'font-bold': true, italic: false, underline: true })).toBe('font-bold underline');
  });

  it('handles array syntax from clsx', () => {
    expect(cn(['flex', 'items-center'], 'gap-4')).toBe('flex items-center gap-4');
  });
});
