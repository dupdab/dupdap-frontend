import { describe, expect, it } from 'vitest';
import { getCsrfToken, isMutationMethod } from './csrf';

describe('CSRF request helpers', () => {
  it('reads and decodes the double-submit cookie value', () => {
    expect(getCsrfToken('session=abc; csrf_token=token%2Fvalue')).toBe(
      'token/value'
    );
  });

  it('does not confuse similarly named cookies for the CSRF cookie', () => {
    expect(getCsrfToken('csrf_token_old=wrong')).toBeUndefined();
  });

  it.each(['post', 'patch', 'put', 'delete'])(
    'identifies %s as a mutation',
    (method) => {
      expect(isMutationMethod(method)).toBe(true);
    }
  );

  it.each(['get', 'head', 'options', undefined])(
    'does not identify %s as a mutation',
    (method) => {
      expect(isMutationMethod(method)).toBe(false);
    }
  );
});
