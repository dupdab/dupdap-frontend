'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { COUNTRIES } from '@/lib/countries';
import { getErrorMessage } from '@/lib/errors';
import { isAuthResponse } from '@/lib/types';

const PASSWORD_REQUIREMENTS = [
  { key: 'length', label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { key: 'uppercase', label: 'One uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { key: 'lowercase', label: 'One lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { key: 'number', label: 'One number', test: (v: string) => /[0-9]/.test(v) },
  { key: 'special', label: 'One special character', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [form, setForm] = useState({
    email: '',
    password: '',
    businessName: '',
    country: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const checks = PASSWORD_REQUIREMENTS.reduce<Record<string, boolean>>((acc, req) => {
    acc[req.key] = req.test(form.password);
    return acc;
  }, {});
  const metCount = PASSWORD_REQUIREMENTS.filter((req) => checks[req.key]).length;
  const passwordValid =
    checks.length && checks.uppercase && checks.lowercase && checks.number && checks.special;
  const passwordsMatch = form.password === confirmPassword;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await authApi.register(form);
      if (!isAuthResponse(data)) {
        throw new Error('Unexpected response from server');
      }
      setAuth(data.accessToken, data.merchant);
      router.push('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Each field key doubles as the input id so htmlFor/id are always in sync (#156).
  const field = (
    key: keyof typeof form,
    label: string,
    type = 'text',
    required = true,
    autoComplete?: string,
  ) => (
    <div>
      <label htmlFor={key} className="label">{label}</label>
      <input
        id={key}
        className="input"
        type={type}
        required={required}
        autoComplete={autoComplete}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  const requirements: { key: keyof PasswordChecks; label: string }[] = [
    { key: 'length', label: 'At least 8 characters' },
    { key: 'upper', label: 'An uppercase letter' },
    { key: 'lower', label: 'A lowercase letter' },
    { key: 'number', label: 'A number' },
    { key: 'special', label: 'A special character' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create your account</h1>
          <p className="mt-2 text-sm text-gray-600">
            Start accepting Stellar payments in minutes
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4" aria-busy={loading}>
          {/* Visually-hidden live region announces submit outcomes to screen readers (#158) */}
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {loading ? 'Creating account, please wait…' : ''}
          </p>

          {formError && (
            <div
              data-testid="register-form-error"
              role="alert"
              className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700"
            >
              {formError}
            </div>
          )}

          <fieldset disabled={loading} className="space-y-4">
            {field('businessName', 'Business Name', 'text', true, 'organization')}
            {field('email', 'Email', 'email', true, 'email')}

          <div>
            <label htmlFor="businessName" className="block text-sm font-medium text-gray-700">
              Business name
            </label>
            <input
              id="businessName"
              name="businessName"
              type="text"
              required
              value={form.businessName}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={form.password}
              onChange={handleChange}
              aria-describedby="password-requirements"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            <ul
              id="password-requirements"
              aria-live="polite"
              className="mt-2 space-y-1 text-sm text-gray-600"
            >
              {PASSWORD_REQUIREMENTS.map((req) => (
                <li key={req.key} className={checks[req.key] ? 'text-green-600' : undefined}>
                  <span aria-hidden="true">{checks[req.key] ? '✓' : '•'}</span>{' '}
                  {req.label}
                </li>
              ))}
            </ul>
            <p className="sr-only" aria-live="polite">
              {metCount} of {PASSWORD_REQUIREMENTS.length} requirements met
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-describedby={!passwordsMatch ? 'confirm-password-error' : undefined}
              aria-invalid={!passwordsMatch}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            {!passwordsMatch && (
              <p
                id="confirm-password-error"
                role="alert"
                className="text-xs text-red-500 mt-1"
              >
                Passwords do not match
              </p>
            )}
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700">
              Country
            </label>
            <select
              id="country"
              name="country"
              required
              value={form.country}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">Select a country</option>
              {COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !passwordValid || !passwordsMatch}
            className="w-full flex justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
