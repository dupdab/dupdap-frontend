'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from '@/lib/toast';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { getErrorMessage, isAxiosError } from '@/lib/errors';
import { isAuthResponse } from '@/lib/types';
import { useLocale } from '@/lib/locale';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const setAuth = useAuthStore((state) => state.setAuth);
  const next = searchParams.get('next') ?? '/dashboard';

  const [showPassword, setShowPassword] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  // Brief client-side cooldown after a failed attempt. This is defence in
  // depth only — the backend remains the authoritative rate limiter.
  const [cooldown, setCooldown] = useState(false);
  const [lockout, setLockout] = useState<{ message: string; rateLimit: boolean } | null>(null);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
    },
    []
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const errorMessages = [errors.email?.message, errors.password?.message].filter(
    (message): message is string => Boolean(message),
  );

  useEffect(() => {
    if (errorMessages.length === 0) return;
    const firstInvalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstInvalid.focus();
    }
  }, [errorMessages.length]);

  const onSubmit = async (values: LoginFormValues) => {
    setLockout(null);
    try {
      const response = await authApi.login({ email: values.email, password: values.password });
      if (!isAuthResponse(response.data)) {
        throw new Error('Unexpected response from server');
      }
      setAuth(response.data.merchant);
      router.push(next);
    } catch (err) {
      const message = getErrorMessage(err) ?? 'Invalid credentials';
      const status = isAxiosError(err) ? err.response?.status : undefined;
      const rateLimit = status === 429 || /too many (attempts|requests)/i.test(message);
      const isLockout =
        status === 423 ||
        rateLimit ||
        /\block(ed|out)?\b|temporarily disabled/i.test(message);

      if (isLockout) {
        setLockout({ message, rateLimit });
      }

      // Throttle repeat submissions for 2 seconds after every failed attempt.
      setCooldown(true);
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
      cooldownTimer.current = setTimeout(() => {
        setCooldown(false);
        cooldownTimer.current = null;
      }, 2000);

      toast.error(message);
    }
  };

  const loading = isSubmitting || cooldown;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('auth.signIn')}</h1>
          <p className="mt-2 text-sm text-gray-600">{t('auth.signInSubtitle')}</p>
        </div>

        <form
          ref={formRef}
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          aria-busy={loading}
          noValidate
        >
          {lockout && (
            <div
              role="alert"
              data-testid={lockout.rateLimit ? 'login-rate-limit-banner' : 'login-lockout-banner'}
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {lockout.message}
            </div>
          )}
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {loading ? t('auth.signingIn') : ''}
          </p>

          <div aria-live="polite" aria-atomic="true" data-testid="login-error-summary">
            {errorMessages.length > 0 && (
              <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3">
                <p className="text-sm font-medium text-red-800">
                  Please fix the following {errorMessages.length === 1 ? 'error' : 'errors'}:
                </p>
                <ul className="mt-1 list-disc list-inside text-xs text-red-600">
                  {errorMessages.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <fieldset disabled={loading} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {t('auth.email')}
              </label>
              <input
                id="email"
                type="email"
                {...register('email')}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              {errors.email && (
                <p id="email-error" role="alert" className="text-xs text-red-500 mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {t('auth.password')}
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-indigo-600 hover:text-indigo-500"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" role="alert" className="text-xs text-red-500 mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              data-testid="login-submit-button"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('auth.signingIn') : t('auth.signIn')}
            </button>
          </fieldset>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          {t('auth.noAccount')}{' '}
          <Link href="/auth/register" className="font-medium text-indigo-600 hover:text-indigo-500">
            {t('auth.createOne')}
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-gray-600">
          <Link href="/auth/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
            {t('auth.forgotPassword')}
          </Link>
        </p>
      </div>
    </div>
  );
}

/**
 * `useSearchParams` opts the component out of static prerendering, so it must
 * sit behind a Suspense boundary.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner showLabel /></div>}>
      <LoginForm />
    </Suspense>
  );
}
