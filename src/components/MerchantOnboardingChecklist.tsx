'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Circle, X } from 'lucide-react';
import { merchantApi, webhooksApi } from '@/lib/api';

const STEPS = [
  {
    id: 'profile',
    label: 'Complete your profile',
    href: '/dashboard/settings',
  },
  {
    id: 'bank',
    label: 'Add a bank account',
    href: '/dashboard/settings#bank-account',
  },
  {
    id: 'payment',
    label: 'Create your first payment',
    href: '/dashboard/payments',
  },
  { id: 'webhook', label: 'Add a webhook', href: '/dashboard/webhooks' },
] as const;

interface SavedProgress {
  completed: string[];
  dismissed: boolean;
}

function progressKey(merchantId?: string): string {
  return `dupdub-onboarding-${merchantId ?? 'merchant'}`;
}

function readProgress(key: string): SavedProgress {
  if (typeof window === 'undefined') return { completed: [], dismissed: false };
  try {
    const value = window.localStorage.getItem(key);
    if (!value) return { completed: [], dismissed: false };
    const parsed = JSON.parse(value) as Partial<SavedProgress>;
    return {
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
      dismissed: parsed.dismissed === true,
    };
  } catch {
    return { completed: [], dismissed: false };
  }
}

export function MerchantOnboardingChecklist({
  paymentCount,
  merchantId,
}: {
  paymentCount?: number;
  merchantId?: string;
}) {
  const storageKey = progressKey(merchantId);
  const [saved, setSaved] = useState<SavedProgress>(() =>
    readProgress(storageKey)
  );
  const profileQuery = useQuery({
    queryKey: ['merchant', 'onboarding-profile'],
    queryFn: () => merchantApi.profile(),
  });
  const webhooksQuery = useQuery({
    queryKey: ['webhooks', 'onboarding'],
    queryFn: () => webhooksApi.list(),
  });

  const checks = useMemo(
    () => ({
      profile: Boolean(profileQuery.data?.data.businessName),
      bank: Boolean(profileQuery.data?.data.bankAccountNumber),
      payment: (paymentCount ?? 0) > 0,
      webhook: (webhooksQuery.data?.data.length ?? 0) > 0,
    }),
    [profileQuery.data, paymentCount, webhooksQuery.data]
  );
  const completed = useMemo(
    () => STEPS.filter((step) => checks[step.id]).map((step) => step.id),
    [checks]
  );
  const allComplete = completed.length === STEPS.length;
  const dismissed = saved.dismissed && allComplete;

  useEffect(() => {
    const next: SavedProgress = {
      completed: Array.from(new Set([...saved.completed, ...completed])),
      dismissed: saved.dismissed,
    };
    if (allComplete && saved.dismissed) next.dismissed = true;
    if (JSON.stringify(next) !== JSON.stringify(saved)) {
      setSaved(next);
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    }
  }, [allComplete, completed, saved, storageKey]);

  if ((paymentCount !== 0 && !saved.completed.includes('payment')) || dismissed)
    return null;

  const dismiss = () => {
    const next = { completed, dismissed: true };
    setSaved(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  };

  return (
    <section
      aria-labelledby="onboarding-title"
      className="card mb-8 p-6"
      data-testid="onboarding-checklist"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2
            id="onboarding-title"
            className="text-lg font-semibold text-gray-900 dark:text-gray-100"
          >
            Get started with DupDub
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Complete these steps to start accepting payments.
          </p>
        </div>
        {allComplete && (
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss onboarding checklist"
            className="rounded p-1 text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>
      <ol className="mt-5 grid gap-3 sm:grid-cols-2">
        {STEPS.map((step) => {
          const done = checks[step.id];
          const Icon = done ? CheckCircle2 : Circle;
          return (
            <li key={step.id}>
              <Link
                href={step.href}
                className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 text-sm hover:border-brand-300 dark:border-gray-800"
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${done ? 'text-green-600' : 'text-gray-400'}`}
                  aria-hidden="true"
                />
                <span
                  className={
                    done
                      ? 'text-gray-500 line-through'
                      : 'text-gray-800 dark:text-gray-200'
                  }
                >
                  {step.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-xs text-gray-500" aria-live="polite">
        {completed.length} of {STEPS.length} steps complete
      </p>
    </section>
  );
}
