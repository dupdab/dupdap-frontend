'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from '@/lib/toast';
import { authApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';

/**
 * Password strength rules. Shared shape with the register page so a user
 * creating an account and a user resetting one are held to the same bar.
 */
const PASSWORD_REQUIREMENTS = [
  { key: 'length', label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { key: 'uppercase', label: 'An uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { key: 'lowercase', label: 'A lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { key: 'number', label: 'A number', test: (v: string) => /[0-9]/.test(v) },
];

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const checks = PASSWORD_REQUIREMENTS.reduce<Record<string, boolean>>((acc, req) => {
    acc[req.key] = req.test(password);
    return acc;
  }, {});
  const passwordValid = PASSWORD_REQUIREMENTS.every((req) => checks[req.key]);
  const passwordsMatch = password === confirmPassword;

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!passwordsMatch) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword({ token, password });
      toast.success('Your password has been reset. Please sign in.');
      router.push('/auth/login');
    } catch (err) {
      toast.error(getErrorMessage(err) ?? 'This reset link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  }

  // Without a token the form can never succeed, so surface a guard instead of
  // a form the user can only fail to submit.
  if (!token) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-16">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold">Invalid reset link</h1>
          <p className="text-sm text-muted-foreground">
            This password reset link is missing or invalid. Request a new one to continue.
          </p>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/auth/forgot-password" className="font-medium underline">
            Forgot password
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-16">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold">Reset your password</h1>
        <p className="text-sm text-muted-foreground">
          Choose a new password for your account.
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-sm font-medium">
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby="password-requirements"
            required
            className="rounded-md border px-3 py-2 text-sm"
          />
          <ul
            id="password-requirements"
            aria-live="polite"
            className="mt-1 flex flex-col gap-1 text-sm text-muted-foreground"
          >
            {PASSWORD_REQUIREMENTS.map((req) => (
              <li key={req.key} className={checks[req.key] ? 'text-green-600' : undefined}>
                <span aria-hidden="true">{checks[req.key] ? '✓' : '•'}</span>{' '}
                {req.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-describedby={!passwordsMatch ? 'confirm-password-error' : undefined}
            aria-invalid={!passwordsMatch}
            required
            className="rounded-md border px-3 py-2 text-sm"
          />
          {!passwordsMatch && (
            <p id="confirm-password-error" role="alert" className="text-xs text-red-500">
              Passwords do not match
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !passwordValid || !passwordsMatch}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/auth/login" className="font-medium underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

/**
 * `useSearchParams` opts the component out of static prerendering, so it must
 * sit behind a Suspense boundary (mirrors the login page).
 */
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-md py-16 text-center text-sm text-muted-foreground">Loading…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
