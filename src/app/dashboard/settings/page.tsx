'use client';

import { Eye, EyeOff, Copy, Check } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';

import ConfirmDialog from '@/components/ConfirmDialog';
import { FormField } from '@/components/FormField';
import { merchantApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import toast from '@/lib/toast';
import { maskSecret } from '@/lib/utils';

/* ── Constants ─────────────────────────────────────────────────────────── */

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ACCEPTED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const AVATAR_SIZE = 256;

const AVAILABLE_SCOPES = [
  'payments:read',
  'payments:write',
  'settlements:read',
  'webhooks:read',
  'webhooks:write',
];

const NAV_GUARD_MESSAGE =
  'Your API key is only shown once. Copy it before leaving this page.';

/* ── Avatar helpers (unchanged from prior implementation) ──────────────── */

function cropToSquare(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new globalThis.Image();

    image.onload = () => {
      const side = Math.min(image.width, image.height);
      const offsetX = (image.width - side) / 2;
      const offsetY = (image.height - side) / 2;

      const canvas = document.createElement('canvas');
      canvas.width = AVATAR_SIZE;
      canvas.height = AVATAR_SIZE;

      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Unable to crop image'));
        return;
      }

      context.drawImage(
        image,
        offsetX,
        offsetY,
        side,
        side,
        0,
        0,
        AVATAR_SIZE,
        AVATAR_SIZE
      );
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL('image/png'));
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to read image'));
    };

    image.src = objectUrl;
  });
}

/* ── Types ─────────────────────────────────────────────────────────────── */

interface ProfileForm {
  businessName: string;
  country: string;
  bankName: string;
  bankCode: string;
  bankAccountNumber: string;
  [key: string]: string;
}

interface FieldErrors {
  businessName?: string;
  country?: string;
  bankName?: string;
  bankCode?: string;
  bankAccountNumber?: string;
}

/* ── Component ─────────────────────────────────────────────────────────── */

export default function SettingsPage() {
  /* ── Avatar state ─────────────────────────────────────────────────────── */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  /* ── Profile form state ───────────────────────────────────────────────── */
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    businessName: '',
    country: '',
    bankName: '',
    bankCode: '',
    bankAccountNumber: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  /* ── API key scope state ─────────────────────────────────────────────── */
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [profileScopes, setProfileScopes] = useState<string[]>([]);

  /* ── API key generation state ─────────────────────────────────────────── */
  const [confirmGenerateOpen, setConfirmGenerateOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [keyRevealed, setKeyRevealed] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);

  /* ── Load profile on mount ───────────────────────────────────────────── */
  useEffect(() => {
    setProfileLoading(true);
    merchantApi
      .profile()
      .then(({ data }) => {
        setProfileForm({
          businessName: data.businessName ?? '',
          country: data.country ?? '',
          bankName: data.bankName ?? '',
          bankCode: data.bankCode ?? '',
          bankAccountNumber: data.bankAccountNumber ?? '',
        });
        const scopes = data.apiKeyScopes ?? [];
        setProfileScopes(scopes);
        setSelectedScopes(scopes);
      })
      .catch((err) => {
        toast.error(getErrorMessage(err) ?? 'Failed to load profile');
      })
      .finally(() => setProfileLoading(false));
  }, []);

  /* ── Navigation guard while key is on screen ─────────────────────────── */
  useEffect(() => {
    if (!generatedKey) return;

    // Guard browser-level navigation (reload, tab close).
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = NAV_GUARD_MESSAGE;
      return NAV_GUARD_MESSAGE;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Guard in-app link navigation (#336).
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const anchor = target.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute('href') ?? '';
      // Only intercept same-origin in-app links.
      if (href.startsWith('/') || href.startsWith(window.location.origin)) {
        if (!window.confirm(NAV_GUARD_MESSAGE)) {
          event.preventDefault();
        }
      }
    };
    document.addEventListener('click', handleClick, true);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleClick, true);
    };
  }, [generatedKey]);

  /* ── Avatar handling ─────────────────────────────────────────────────── */
  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setAvatarError(null);

    if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
      setAvatarError('Please upload a JPG, PNG, or WebP image.');
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError('Image must be 2MB or smaller.');
      return;
    }

    setIsProcessing(true);
    try {
      const cropped = await cropToSquare(file);
      setAvatar(cropped);
    } catch {
      setAvatarError('Could not process that image. Please try another file.');
    } finally {
      setIsProcessing(false);
    }
  };

  /* ── Profile save ─────────────────────────────────────────────────────── */
  const handleProfileSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setFieldErrors({});
    setSaving(true);
    try {
      await merchantApi.update(profileForm);
      toast.success('Profile saved');
    } catch (err: unknown) {
      // Surface field-level validation errors if the API returns them.
      const responseData = (
        err as {
          response?: { data?: { errors?: FieldErrors; message?: string } };
        }
      )?.response?.data;
      if (responseData?.errors && typeof responseData.errors === 'object') {
        setFieldErrors(responseData.errors);
      } else {
        toast.error(getErrorMessage(err as Error) ?? 'Failed to save profile');
      }
    } finally {
      setSaving(false);
    }
  };

  /* ── Scope toggle ─────────────────────────────────────────────────────── */
  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  /* ── API key generation ───────────────────────────────────────────────── */
  const handleGenerateKey = async () => {
    setConfirmGenerateOpen(false);
    setGenerating(true);
    try {
      const { data } = await merchantApi.generateApiKey(selectedScopes);
      setGeneratedKey(data.apiKey);
      setKeyRevealed(false);
      setKeyCopied(false);
    } catch (err) {
      toast.error(getErrorMessage(err) ?? 'Failed to generate API key');
    } finally {
      setGenerating(false);
    }
  };

  const copyKey = async () => {
    if (!generatedKey) return;
    try {
      await navigator.clipboard.writeText(generatedKey);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    } catch {
      toast.error('Failed to copy API key');
    }
  };

  const dismissKey = () => {
    setGeneratedKey(null);
    setKeyRevealed(false);
    setKeyCopied(false);
  };

  /* ── Render helpers ───────────────────────────────────────────────────── */
  const displayedKey = generatedKey
    ? keyRevealed
      ? generatedKey
      : maskSecret(generatedKey)
    : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Settings
      </h1>

      {/* ── API key banner (generated key, shown once) ──────────────────── */}
      {generatedKey && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-yellow-300 bg-yellow-50 p-4"
        >
          <p className="text-sm font-medium text-yellow-800 mb-2">
            Save this key now — it will only be shown once.
          </p>
          <div className="flex items-center gap-2 font-mono text-sm bg-white border border-yellow-200 rounded px-3 py-2">
            <span className="flex-1 break-all">{displayedKey}</span>
            <button
              type="button"
              aria-label={keyRevealed ? 'Hide API key' : 'Reveal API key'}
              onClick={() => setKeyRevealed((v) => !v)}
              className="shrink-0 text-gray-400 hover:text-gray-600"
            >
              {keyRevealed ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              aria-label="Copy API key"
              onClick={copyKey}
              className="shrink-0 text-gray-400 hover:text-gray-600"
            >
              {keyCopied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
          <button
            type="button"
            onClick={dismissKey}
            className="mt-3 text-sm text-yellow-700 underline hover:text-yellow-900"
          >
            I&apos;ve saved it
          </button>
        </div>
      )}

      {/* ── Avatar ──────────────────────────────────────────────────────── */}
      <section className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Merchant avatar
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Upload a logo or photo. JPG, PNG, or WebP up to 2MB. Images are
          cropped to a 1:1 square.
        </p>

        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gray-100">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt="Merchant avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xs text-gray-400">No avatar</span>
            )}
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {isProcessing
                ? 'Processing…'
                : avatar
                  ? 'Change avatar'
                  : 'Upload avatar'}
            </button>
          </div>
        </div>

        {avatarError ? (
          <p className="mt-2 text-sm text-red-600">{avatarError}</p>
        ) : null}
      </section>

      {/* ── Profile form ────────────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Profile
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Update your business name, country, and settlement bank details.
        </p>

        <form onSubmit={handleProfileSave} className="mt-6 space-y-4">
          <FormField
            label="Business name"
            name="businessName"
            value={profileForm.businessName}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setProfileForm((f) => ({ ...f, businessName: e.target.value }))
            }
            error={fieldErrors.businessName}
            disabled={profileLoading || saving}
            required
          />
          <FormField
            label="Country"
            name="country"
            value={profileForm.country}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setProfileForm((f) => ({ ...f, country: e.target.value }))
            }
            error={fieldErrors.country}
            disabled={profileLoading || saving}
          />
          <FormField
            label="Bank name"
            name="bankName"
            value={profileForm.bankName}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setProfileForm((f) => ({ ...f, bankName: e.target.value }))
            }
            error={fieldErrors.bankName}
            disabled={profileLoading || saving}
          />
          <FormField
            label="Bank code"
            name="bankCode"
            value={profileForm.bankCode}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setProfileForm((f) => ({ ...f, bankCode: e.target.value }))
            }
            error={fieldErrors.bankCode}
            disabled={profileLoading || saving}
          />
          <FormField
            label="Bank account number"
            name="bankAccountNumber"
            value={profileForm.bankAccountNumber}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setProfileForm((f) => ({
                ...f,
                bankAccountNumber: e.target.value,
              }))
            }
            error={fieldErrors.bankAccountNumber}
            disabled={profileLoading || saving}
          />

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving || profileLoading}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </section>

      {/* ── API key scopes ───────────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          API key scopes
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Select which permissions will be granted to the next generated key.
        </p>

        {/* Scope toggles — pre-checked from the merchant's current profile scopes. */}
        <div className="mt-4">
          {profileScopes.length === 0 && selectedScopes.length === 0 ? (
            <p className="text-sm text-gray-400 mb-3">
              No API key scopes assigned yet.
            </p>
          ) : null}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Show all profile scopes plus AVAILABLE_SCOPES, deduped. */}
            {Array.from(new Set([...profileScopes, ...AVAILABLE_SCOPES])).map(
              (scope) => (
                <label
                  key={scope}
                  className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedScopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                    aria-label={scope.replace(':', ': ')}
                    className="rounded border-gray-300"
                  />
                  <span className="font-mono text-xs">{scope}</span>
                </label>
              )
            )}
          </div>
        </div>
      </section>

      {/* ── Generate API key ─────────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          API keys
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Generate a new API key. Existing keys are not revoked.
        </p>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => setConfirmGenerateOpen(true)}
            disabled={generating}
            className="btn-primary disabled:opacity-50"
          >
            {generating ? 'Generating…' : 'Generate new API key'}
          </button>
        </div>
      </section>

      {/* ── Confirm API key generation ───────────────────────────────────── */}
      <ConfirmDialog
        open={confirmGenerateOpen}
        title="Generate a new API key?"
        message="A new key will be created with the selected scopes. It will only be shown once."
        confirmLabel="Generate key"
        cancelLabel="Cancel"
        loading={generating}
        onConfirm={handleGenerateKey}
        onCancel={() => setConfirmGenerateOpen(false)}
      />
    </div>
  );
}
