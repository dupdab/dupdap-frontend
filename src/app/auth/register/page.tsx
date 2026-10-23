'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from '@/lib/toast';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { COUNTRIES } from '@/lib/countries';
import { getErrorMessage } from '@/lib/errors';
import { isAuthResponse } from '@/lib/types';

const PASSWORD_REQUIREMENTS = [
  {
    key: 'length',
    label: 'At least 8 characters',
    test: (v: string) => v.length >= 8,
  },
  {
    key: 'uppercase',
    label: 'One uppercase letter',
    test: (v: string) => /[A-Z]/.test(v),
  },
  {
    key: 'lowercase',
    label: 'One lowercase letter',
    test: (v: string) => /[a-z]/.test(v),
  },
  { key: 'number', label: 'One number', test: (v: string) => /[0-9]/.test(v) },
  {
    key: 'special',
    label: 'One special character',
    test: (v: string) => /[^A-Za-z0-9]/.test(v),
  },
];

const registerSchema = z
  .object({
    businessName: z.string().min(1, 'Business name is required'),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'One uppercase letter')
      .regex(/[a-z]/, 'One lowercase letter')
      .regex(/[0-9]/, 'One number')
      .regex(/[^A-Za-z0-9]/, 'One special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    country: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const {
    register,
    handleSubmit,
    watch,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      businessName: '',
      email: '',
      password: '',
      confirmPassword: '',
      country: '',
    },
  });

  const password = watch('password') ?? '';
  const confirmPassword = watch('confirmPassword') ?? '';

  const checks = PASSWORD_REQUIREMENTS.reduce<Record<string, boolean>>(
    (acc, req) => {
      acc[req.key] = req.test(password);
      return acc;
    },
    {}
  );
  const metCount = PASSWORD_REQUIREMENTS.filter(
    (req) => checks[req.key]
  ).length;
  const passwordValid =
    checks['length'] &&
    checks.uppercase &&
    checks.lowercase &&
    checks.number &&
    checks.special;

  const passwordsMatch = password === confirmPassword;

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      const response = await authApi.register({
        email: values.email,
        password: values.password,
        businessName: values.businessName,
        country: values.country ?? '',
      });
      if (!isAuthResponse(response.data)) {
        throw new Error('Unexpected response from server');
      }
      setAuth(response.data.merchant);
      router.push('/dashboard');
    } catch (err) {
      // Surface the failure both inline (persistent banner) and as a toast so
      // it is announced immediately without losing context on scroll (#408).
      const message = getErrorMessage(err) ?? 'Registration failed';
      setFieldError('root', { type: 'server', message });
      toast.error(message);
    }
  };

  const loading = isSubmitting;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Start accepting Stellar payments in minutes
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          aria-busy={loading}
          noValidate
        >
          {/* Visually-hidden live region announces submit outcomes to screen readers (#158) */}
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {loading ? 'Creating account, please wait…' : ''}
          </p>

          {errors.root?.message && (
            <div
              data-testid="register-form-error"
              role="alert"
              className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700"
            >
              {errors.root.message}
            </div>
          )}

          <fieldset disabled={loading} className="space-y-4">
            <div>
              <label
                htmlFor="businessName"
                className="block text-sm font-medium text-gray-700"
              >
                Business name
              </label>
              <input
                id="businessName"
                type="text"
                {...register('businessName')}
                aria-invalid={!!errors.businessName}
                aria-describedby={
                  errors.businessName ? 'businessName-error' : undefined
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              {errors.businessName && (
                <p
                  id="businessName-error"
                  role="alert"
                  className="text-xs text-red-500 mt-1"
                >
                  {errors.businessName.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
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
                <p
                  id="email-error"
                  role="alert"
                  className="text-xs text-red-500 mt-1"
                >
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                {...register('password')}
                aria-describedby="password-requirements"
                aria-invalid={!!errors.password}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              <ul
                id="password-requirements"
                aria-live="polite"
                className="mt-2 space-y-1 text-sm text-gray-600"
              >
                {PASSWORD_REQUIREMENTS.map((req) => (
                  <li
                    key={req.key}
                    className={checks[req.key] ? 'text-green-600' : undefined}
                  >
                    <span aria-hidden="true">
                      {checks[req.key] ? '✓' : '•'}
                    </span>{' '}
                    {req.label}
                  </li>
                ))}
              </ul>
              <p className="sr-only" aria-live="polite">
                {metCount} of {PASSWORD_REQUIREMENTS.length} requirements met
              </p>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700"
              >
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                {...register('confirmPassword')}
                aria-describedby={
                  errors.confirmPassword ? 'confirm-password-error' : undefined
                }
                aria-invalid={!!errors.confirmPassword}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              {errors.confirmPassword && (
                <p
                  id="confirm-password-error"
                  role="alert"
                  className="text-xs text-red-500 mt-1"
                >
                  {errors.confirmPassword.message}
                </p>
              )}
              {/* Live mismatch feedback so merchants see it without submitting */}
              {password !== '' && confirmPassword !== '' && !passwordsMatch && (
                <p role="alert" className="text-xs text-red-500 mt-1">
                  Passwords do not match
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="country"
                className="block text-sm font-medium text-gray-700"
              >
                Country
              </label>
              <select
                id="country"
                {...register('country')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Select a country</option>
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>

          <button
            data-testid="register-submit-button"
            type="submit"
            disabled={loading || !passwordValid || !passwordsMatch}
            className="w-full flex justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            href="/auth/login"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
