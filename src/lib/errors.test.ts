import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';

import {
  getErrorMessage,
  GENERIC_ERROR_MESSAGE,
  NETWORK_ERROR_MESSAGE,
  normalizeError,
  TIMEOUT_MESSAGE,
} from './errors';

describe('getErrorMessage', () => {
  it('extracts message from AxiosError response data message', () => {
    const error = new AxiosError('Request failed with status code 400');
    error.response = {
      data: { message: 'Invalid credentials provided' },
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: { headers: new AxiosHeaders() },
    };

    expect(getErrorMessage(error)).toBe('Invalid credentials provided');
  });

  it('falls back to AxiosError message if response data has no message', () => {
    const error = new AxiosError('Network Error');
    error.response = {
      data: {},
      status: 500,
      statusText: 'Internal Server Error',
      headers: {},
      config: { headers: new AxiosHeaders() },
    };

    expect(getErrorMessage(error)).toBe('Network Error');
  });

  it('falls back to AxiosError message if response is undefined', () => {
    const error = new AxiosError('Connection refused');
    expect(getErrorMessage(error)).toBe('Connection refused');
  });

  it('extracts message from a standard Error instance', () => {
    const error = new Error('Something went wrong');
    expect(getErrorMessage(error)).toBe('Something went wrong');
  });

  it('returns undefined for a standard Error with an empty message', () => {
    const error = new Error('');
    expect(getErrorMessage(error)).toBeUndefined();
  });

  it('returns undefined for non-Error thrown objects', () => {
    expect(getErrorMessage({ message: 'Fake error' })).toBeUndefined();
    expect(getErrorMessage({ error: 'Failed' })).toBeUndefined();
  });

  it('returns undefined for primitives and nullish values', () => {
    expect(getErrorMessage(null)).toBeUndefined();
    expect(getErrorMessage(undefined)).toBeUndefined();
    expect(getErrorMessage('error string')).toBeUndefined();
    expect(getErrorMessage(12345)).toBeUndefined();
    expect(getErrorMessage(false)).toBeUndefined();
  });
});

function axiosErrorWithBody(data: unknown, status = 400): AxiosError {
  const error = new AxiosError(`Request failed with status code ${status}`);
  error.response = {
    data,
    status,
    statusText: 'Error',
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
  return error;
}

describe('normalizeError (#801)', () => {
  it.each([
    ['{ message }', { message: 'Invalid amount' }, 'Invalid amount'],
    ['{ message: string[] }', { message: ['Email must be valid'] }, 'Email must be valid'],
    ['{ error: string }', { error: 'Payment not found' }, 'Payment not found'],
    [
      '{ error: { message } }',
      { error: { code: 'FORBIDDEN', message: 'Not allowed' } },
      'Not allowed',
    ],
    [
      '{ errors: [{ message }] }',
      { errors: [{ field: 'amount', message: 'Too small' }] },
      'Too small',
    ],
    ['{ errors: string[] }', { errors: ['Currency is required'] }, 'Currency is required'],
    [
      '{ errors: { field: message } }',
      { errors: { bankCode: 'Must be 3-6 digits' } },
      'Must be 3-6 digits',
    ],
    ['{ detail }', { detail: 'Rate limited' }, 'Rate limited'],
    ['plain string body', 'Bad Gateway', 'Bad Gateway'],
  ])('extracts the message from a %s body', (_shape, data, expected) => {
    expect(normalizeError(axiosErrorWithBody(data))).toEqual({ message: expected });
  });

  it('falls back to the Axios message for an empty body', () => {
    expect(normalizeError(axiosErrorWithBody({}, 500))).toEqual({
      message: 'Request failed with status code 500',
    });
  });

  it('maps a timeout to "Request timed out" (#800)', () => {
    const error = new AxiosError('timeout of 30000ms exceeded', 'ECONNABORTED');
    expect(normalizeError(error)).toEqual({ message: TIMEOUT_MESSAGE });
    expect(getErrorMessage(error)).toBe('Request timed out');
  });

  it('maps ETIMEDOUT to "Request timed out"', () => {
    expect(normalizeError({ code: 'ETIMEDOUT' })).toEqual({ message: TIMEOUT_MESSAGE });
  });

  it('uses a network error message when there is no response or message', () => {
    expect(normalizeError({})).toEqual({ message: NETWORK_ERROR_MESSAGE });
  });

  it('uses a generic message for non-object values', () => {
    expect(normalizeError(undefined)).toEqual({ message: GENERIC_ERROR_MESSAGE });
  });

  it('always returns a { message: string } shape', () => {
    for (const value of [null, 'x', 42, {}, new Error('boom'), axiosErrorWithBody(null)]) {
      const result = normalizeError(value);
      expect(Object.keys(result)).toEqual(['message']);
      expect(typeof result.message).toBe('string');
    }
  });
});
