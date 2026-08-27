'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { FormField } from '@/components/FormField';
import { getErrorMessage } from '@/lib/errors';

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    businessName: '',
    country: '',
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.register(form);
      setAuth(data.accessToken, data.merchant);
      router.push('/dashboard');
    } catch (err) {
      toast.error(getErrorMessage(err) ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-brand-600 mb-1">DupDub</h1>
          <p className="text-gray-500 text-sm">Create your merchant account</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <fieldset disabled={loading} className="space-y-4">
            <FormField label="Business Name" value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
            <FormField label="Email" type="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <FormField label="Password" type="password" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <FormField label="Country (optional)" type="text" required={false} value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })} />
            <button data-testid="register-submit-button" type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </fieldset>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-brand-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
