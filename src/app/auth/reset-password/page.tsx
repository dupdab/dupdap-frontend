'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';

const RULES: { test: (pw: string) => boolean; label: string }[] = [
  { test: (pw) => pw.length >= 8, label: 'At least 8 characters' },
  { test: (pw) => /[A-Z]/.test(pw), label: 'An uppercase letter' },
  { test: (pw) => /[a-z]/.test(pw), label: 'A lowercase letter' },
  { test: (pw) => /\d/.test(pw), label: 'A number' },
];

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ password: '', confirmPassword: '' });

  const passed = RULES.filter((r) => r.test(form.password)).length;
  const passwordValid = passed === RULES.length;
  const passwordsMatch =
    form.confirmPassword.length === 0 || form.password === form.confirmPassword;
  const canSubmit = passwordValid && form.password === form.confirmPassword;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      await authApi.resetPassword({ token, password: form.password });
      toast.success('Password updated. Please sign in.');
      router.push('/auth/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'This reset link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center py-6">
        <h3 className="font-semibold text-lg">Invalid reset link</h3>
        <p className="text-gray-500 text-sm mt-2">
          This link is missing its reset token. Request a new one from the{' '}
          <Link href="/auth/forgot-password" className="text-brand-600 font-medium hover:underline">
            forgot password
          </Link>{' '}
          page.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset disabled={loading} className="space-y-4">
        <div>
          <label className="label">New Password</label>
          <input
            className="input"
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          {form.password.length > 0 && (
            <ul className="mt-2 grid grid-cols-1 gap-1">
              {RULES.map((r) => {
                const ok = r.test(form.password);
                return (
                  <li
                    key={r.label}
                    className={`text-xs flex items-center gap-1.5 ${ok ? 'text-green-600' : 'text-gray-400'}`}
                  >
                    <span className="inline-block w-3.5 text-center text-[10px]">{ok ? '✓' : '•'}</span>
                    {r.label}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <label className="label">Confirm New Password</label>
          <input
            className={`input ${form.confirmPassword.length > 0 && !passwordsMatch ? 'border-red-400 focus:ring-red-400' : ''}`}
            type="password"
            required
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          />
          {form.confirmPassword.length > 0 && !passwordsMatch && (
            <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
          )}
        </div>

        <button type="submit" disabled={loading || !canSubmit} className="btn-primary w-full">
          {loading ? 'Updating...' : 'Update password'}
        </button>
      </fieldset>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-brand-600 mb-1">DupDub</h1>
          <p className="text-gray-500 text-sm">Choose a new password</p>
        </div>

        <Suspense fallback={<div className="text-center text-sm text-gray-400 py-6">Loading…</div>}>
          <ResetPasswordForm />
        </Suspense>

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link href="/auth/login" className="text-brand-600 font-medium hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
