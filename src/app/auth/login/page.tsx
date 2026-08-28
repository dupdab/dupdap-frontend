'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { useAuthStore } from '@/lib/store';
import { FormField } from '@/components/FormField';

const CAPTCHA_THRESHOLD = 3;

function getRateLimitMessage(err: AxiosError): string {
  const retryAfter = err.response?.headers['retry-after'];
  const seconds = retryAfter ? Number(retryAfter) : NaN;
  if (!Number.isNaN(seconds) && seconds > 0) {
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    return `Too many login attempts. Please try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
  }
  const serverMessage = (err.response?.data as { message?: string } | undefined)?.message;
  if (serverMessage) return serverMessage;
  return 'Too many login attempts. Please try again later.';
}

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [rateLimited, setRateLimited] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', password: '' });

  const showCaptcha = failedAttempts >= CAPTCHA_THRESHOLD;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rateLimited) return;
    setLoading(true);
    try {
      const { data } = await authApi.login(form);
      setAuth(data.accessToken, data.merchant);
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 429) {
        const message = getRateLimitMessage(err);
        setRateLimited(true);
        setRateLimitMessage(message);
        toast.error(message);
      } else {
        setFailedAttempts((count) => count + 1);
        toast.error(getErrorMessage(err) ?? 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-brand-600 mb-1">DupDub</h1>
          <p className="text-gray-500 text-sm">Sign in to your merchant account</p>
        </div>

        {rateLimitMessage ? (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            {rateLimitMessage}
          </div>
        ) : null}

        <form onSubmit={submit} className="space-y-4">
          <fieldset disabled={loading || rateLimited} className="space-y-4">
            <FormField
              label="Email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <FormField
              label="Password"
              type="password"
              required
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />

            {showCaptcha ? (
              <div
                data-testid="login-captcha-slot"
                className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-sm text-gray-500"
                aria-label="CAPTCHA verification"
              >
                Complete verification to continue signing in.
              </div>
            ) : null}

            <button data-testid="login-submit-button" type="submit" disabled={loading || rateLimited} className="btn-primary w-full">
              {loading ? 'Signing in...' : rateLimited ? 'Try again later' : 'Sign in'}
            </button>
          </fieldset>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="text-brand-600 font-medium hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
