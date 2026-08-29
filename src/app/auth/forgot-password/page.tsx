'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { MailCheck } from 'lucide-react';
import { authApi } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword({ email });
      setSent(true);
    } catch (err: any) {
      // Avoid leaking whether an account exists — treat as success unless it's
      // clearly a transport/server error.
      if (err.response && err.response.status < 500) {
        setSent(true);
      } else {
        toast.error(err.response?.data?.message ?? 'Something went wrong. Please try again.');
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
          <p className="text-gray-500 text-sm">Reset your password</p>
        </div>

        {sent ? (
          <div className="text-center py-6">
            <MailCheck className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="font-semibold text-lg">Check your email</h3>
            <p className="text-gray-500 text-sm mt-2">
              If an account exists for <span className="font-medium">{email}</span>, we&apos;ve sent a link
              to reset your password.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <fieldset disabled={loading} className="space-y-4">
              <p className="text-sm text-gray-500">
                Enter the email associated with your account and we&apos;ll send you a link to reset your
                password.
              </p>
              <div>
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </fieldset>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          Remembered it?{' '}
          <Link href="/auth/login" className="text-brand-600 font-medium hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
