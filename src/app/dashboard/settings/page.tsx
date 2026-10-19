'use client';

import { useRef, useState } from 'react';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ACCEPTED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const AVATAR_SIZE = 256;

function cropToSquare(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

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

export default function SettingsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError(null);

    if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
      setError('Please upload a JPG, PNG, or WebP image.');
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setError('Image must be 2MB or smaller.');
      return;
    }

    setIsProcessing(true);
    try {
      const cropped = await cropToSquare(file);
      setAvatar(cropped);
    } catch {
      setError('Could not process that image. Please try another file.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>

      <section className="mt-8">
        <h2 className="text-lg font-medium text-gray-900">Merchant avatar</h2>
        <p className="mt-1 text-sm text-gray-500">
          Upload a logo or photo. JPG, PNG, or WebP up to 2MB. Images are cropped to a 1:1 square.
        </p>

        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gray-100">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="Merchant avatar" className="h-full w-full object-cover" />
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
              {isProcessing ? 'Processing…' : avatar ? 'Change avatar' : 'Upload avatar'}
            </button>
          </div>
        </div>

        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </section>
    </div>
  );
}
