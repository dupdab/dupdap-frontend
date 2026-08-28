'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { CheckCircle } from 'lucide-react';
import { waitlistApi } from '@/lib/api';
import { FormField } from '@/components/FormField';
import { getErrorMessage } from '@/lib/errors';

export const metadata = {
  title: 'Join the waitlist — DupDub',
  description: 'Be first to access DupDub when we launch — join the waitlist today.',
};

export default function WaitlistPage() {
  const [form, setForm] = useState({ email: '', username: '', businessName: '', country: '' });
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);
  const [formError, setFormError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setLoading(true);
    try {
      await waitlistApi.join(form);
      setJoined(true);
    } catch (err) {
      const msg = getErrorMessage(err) ?? 'Failed to join waitlist';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-6">
          <Link href="/" className="font-bold text-xl text-brand-600">DupDub</Link>
          <h2 className="text-2xl font-bold mt-4 mb-2">Join the waitlist</h2>
          <p className="text-gray-500 text-sm">Be first to access DupDub when we launch</p>
        </div>

        {joined ? (
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="font-semibold text-lg">You&apos;re on the list!</h3>
            <p className="text-gray-500 text-sm mt-2">We&apos;ll reach out when your account is ready.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {formError && (
              <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {formError}
              </p>
            )}
            <fieldset disabled={loading} className="space-y-4">
              <FormField label="Email" type="email" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <FormField label="Username (optional)" type="text" required={false} value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })} />
              <FormField label="Business Name (optional)" type="text" required={false} value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
              <FormField label="Country (optional)" type="text" required={false} value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })} />
              <button data-testid="waitlist-submit-button" type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Joining...' : 'Join waitlist'}
              </button>
            </fieldset>
          </form>
        )}
      </div>
    </div>
  );
}
