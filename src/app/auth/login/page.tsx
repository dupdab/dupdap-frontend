'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from '@/lib/toast';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { FormField } from '@/components/FormField';
import { isAuthResponse } from '@/lib/types';
import {
  CAPTCHA_THRESHOLD as SHARED_CAPTCHA_THRESHOLD,
  getErrorMessage,
  getRateLimitMessage as getRateLimitErrorMessage,
} from '@/lib/errors';

const CAPTCHA_THRESHOLD = SHARED_CAPTCHA_THRESHOLD;

function getRateLimitMessage(err: unknown): string {
  return getRateLimitErrorMessage(err) ?? getErrorMessage(err) ?? 'Login failed';
}

function isRateLimited(err: unknown): boolean {
  return getRateLimitErrorMessage(err) !== undefined;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [loading, setLoading] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);

  const showCaptcha = failedAttempts >= CAPTCHA_THRESHOLD;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authApi.login({ email, password });

      if (!isAuthResponse(response.data)) {
        throw new Error('Unexpected response from server');
      }

      const { accessToken, merchant } = response.data;
      setAuth(accessToken, merchant);
      toast.success('Signed in successfully');

      // Guard against open redirects: only same-origin, single-leading-slash
      // paths are forwarded (mirrors AuthRedirectSetup's `next` param writing).
      const requested = searchParams.get('redirect');
      const redirect =
        requested && requested.startsWith('/') && !requested.startsWith('//')
          ? requested
          : '/dashboard';
      router.push(redirect);
    } catch (err) {
      setFailedAttempts((prev) => prev + 1);
      const message = getRateLimitMessage(err);
      if (isRateLimited(err)) {
        setRateLimited(true);
        setRateLimitMessage(message);
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Sign in</h1>
          <p className="mt-2 text-sm text-gray-600">
            Welcome back to StellarPay
          </p>
        </div>

        {rateLimited && rateLimitMessage && (
          <div
            data-testid="login-rate-limit-banner"
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {rateLimitMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <FormField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {showCaptcha && (
            <div
              data-testid="login-captcha"
              role="alert"
              className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700"
            >
              <p className="font-medium">
                Multiple failed attempts detected.
              </p>
              <p className="mt-1">
                Please verify you are human before trying again.
              </p>
            </div>
          )}

          <button
            data-testid="login-submit-button"
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="text-blue-600 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
