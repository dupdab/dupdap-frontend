'use client';

import { useState } from 'react';
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
  { key: 'length', label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { key: 'uppercase', label: 'One uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { key: 'lowercase', label: 'One lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { key: 'number', label: 'One number', test: (v: string) => /[0-9]/.test(v) },
  { key: 'special', label: 'One special character', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

const STRENGTH_LEVELS = ['Weak', 'Fair', 'Strong', 'Very Strong'] as const;
type StrengthLevel = (typeof STRENGTH_LEVELS)[number];

const STRENGTH_STYLES: Record<StrengthLevel, { bar: string; text: string; width: string }> = {
  Weak: { bar: 'bg-red-500', text: 'text-red-600', width: 'w-1/4' },
  Fair: { bar: 'bg-amber-500', text: 'text-amber-600', width: 'w-2/4' },
  Strong: { bar: 'bg-lime-500', text: 'text-lime-600', width: 'w-3/4' },
  'Very Strong': { bar: 'bg-green-600', text: 'text-green-700', width: 'w-full' },
};

function getStrength(metCount: number): StrengthLevel {
  if (metCount <= 2) return 'Weak';
  if (metCount === 3) return 'Fair';
  if (metCount === 4) return 'Strong';
  return 'Very Strong';
}

const registerSchema = z
  .object({
    businessName: z.string().min(1, 'Business name is required'),
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  const checks = PASSWORD_REQUIREMENTS.reduce<Record<string, boolean>>((acc, req) => {
    acc[req.key] = req.test(password);
    return acc;
  }, {});
  const metCount = PASSWORD_REQUIREMENTS.filter((req) => checks[req.key]).length;
  const passwordValid =
    checks.length && checks.uppercase && checks.lowercase && checks.number && checks.special;
  const passwordsMatch = password === confirmPassword;
  const strength = getStrength(metCount);
  const strengthStyle = STRENGTH_STYLES[strength];

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
      setAuth(response.data.accessToken, response.data.merchant);
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
          <h1 className="text-3xl font-bold text-gray-900">Create your account</h1>
          <p className="mt-2 text-sm text-gray-600">
            Start accepting Stellar payments in minutes
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" aria-busy={loading} noValidate>
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
            <label htmlFor="businessName" className="block text-sm font-medium text-gray-700">
              Business name
            </label>
            <input
              id="businessName"
              type="text"
              {...register('businessName')}
              aria-invalid={!!errors.businessName}
              aria-describedby={errors.businessName ? 'businessName-error' : undefined}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            {errors.businessName && (
              <p id="businessName-error" role="alert" className="text-xs text-red-500 mt-1">
                {errors.businessName.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
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
              <p id="email-error" role="alert" className="text-xs text-red-500 mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="relative mt-1">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                aria-describedby="password-requirements password-strength"
                aria-invalid={!!errors.password}
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

            <div id="password-strength" className="mt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Password strength</span>
                <span className={`font-medium ${strengthStyle.text}`} data-testid="password-strength-label">
                  {strength}
                </span>
              </div>
              <div
                className="mt-1 h-1.5 w-full rounded-full bg-gray-200 overflow-hidden"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={4}
                aria-valuenow={metCount}
                aria-valuetext={strength}
              >
                <div className={`h-full rounded-full transition-all ${strengthStyle.bar} ${strengthStyle.width}`} />
              </div>
            </div>

            <ul
              id="password-requirements"
              aria-live="polite"
              className="mt-2 space-y-1 text-sm text-gray-600"
            >
              {PASSWORD_REQUIREMENTS.map((req) => (
                <li key={req.key} className={checks[req.key] ? 'text-green-600' : undefined}>
                  <span aria-hidden="true">{checks[req.key] ? '✓' : '•'}</span>{' '}
                  {req.label}
                </li>
              ))}
            </ul>
            <p className="sr-only" aria-live="polite">
              {metCount} of {PASSWORD_REQUIREMENTS.length} requirements met
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm password
            </label>
            <div className="relative mt-1">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                {...register('confirmPassword')}
                aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                aria-invalid={!!errors.confirmPassword}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pr-16"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showConfirmPassword}
                className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-indigo-600 hover:text-indigo-500"
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.confirmPassword && (
              <p id="confirm-password-error" role="alert" className="text-xs text-red-500 mt-1">
                {errors.confirmPassword.message}
              </p>
            )}
            {!errors.confirmPassword && confirmPassword.length > 0 && (
              <p
                className={`text-xs mt-1 ${passwordsMatch ? 'text-green-600' : 'text-red-500'}`}
                aria-live="polite"
              >
                {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700">
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

          <button
            type="submit"
            disabled={loading || !passwordValid || !passwordsMatch}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
          </fieldset>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
