/**
 * ThemeScript — renders an inline <script> that synchronously reads the
 * persisted theme preference and applies the `dark` class to `<html>` before
 * the page paints, preventing a flash-of-light-theme on initial load.
 *
 * Must be a Server Component (no 'use client') so Next.js inlines it in the
 * HTML <head> before hydration.
 */
export function ThemeScript() {
  // This script runs synchronously in the browser before React hydrates.
  // It reads the Zustand-persisted theme from localStorage (key: 'dupdub-theme')
  // and applies the `dark` class to <html> if needed.
  const script = `
(function() {
  try {
    var stored = localStorage.getItem('dupdub-theme');
    var pref = stored ? JSON.parse(stored).state?.theme : 'system';
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var resolved = pref === 'dark' || (pref !== 'light' && systemDark) ? 'dark' : 'light';
    if (resolved === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`.trim();

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
