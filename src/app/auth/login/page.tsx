'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { FormField } from '@/components/FormField';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [rateLimited, setRateLimited] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', password: '' });
  const [formError, setFormError] = useState('');

  const showCaptcha = failedAttempts >= CAPTCHA_THRESHOLD;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rateLimited) return;
    setLoading(true);
    try {
      const { data } = await authApi.login(form);
      if (!isAuthResponse(data)) {
        toast.error('Invalid response from server. Please try again.');
        return;
      }
      setAuth(data.accessToken, data.merchant);
      const next = searchParams.get('next');
      router.push(next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard');
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

        <form onSubmit={submit} className="space-y-4" aria-busy={loading}>
          {/* Visually-hidden live region announces submit outcomes to screen readers (#158) */}
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {loading ? 'Signing in, please wait…' : ''}
          </p>
          <fieldset disabled={loading} className="space-y-4">
            <FormField label="Email" type="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <FormField label="Password" type="password" required value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button data-testid="login-submit-button" type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in...' : 'Sign in'}
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

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
