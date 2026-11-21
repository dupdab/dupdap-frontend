import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LocaleProvider, LOCALE_LABELS, useLocale } from './locale';

function Probe() {
  const { locale, setLocale, t } = useLocale();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="sign-in">{t('auth.signIn')}</span>
      <button onClick={() => setLocale('pt')}>Português</button>
    </div>
  );
}

describe('locale support', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('offers English, French and Portuguese', () => {
    expect(LOCALE_LABELS.en).toBe('English');
    expect(LOCALE_LABELS.fr).toBe('Français');
    expect(LOCALE_LABELS.pt).toBe('Português');
  });

  it('translates user-facing strings when the locale changes to Portuguese', () => {
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    );

    expect(screen.getByTestId('sign-in')).toHaveTextContent('Sign in');
    fireEvent.click(screen.getByRole('button', { name: 'Português' }));
    expect(screen.getByTestId('locale')).toHaveTextContent('pt');
    expect(screen.getByTestId('sign-in')).toHaveTextContent('Entrar');
  });
});
