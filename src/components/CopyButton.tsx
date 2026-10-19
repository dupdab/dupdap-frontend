'use client';

/**
 * CopyButton — a small icon button that copies `value` to the clipboard.
 *
 * Props:
 *   value       – text to copy
 *   label       – accessible aria-label (e.g. "Copy payment link")
 *   copiedLabel – aria-label to use while showing the ✓ (defaults to "Copied")
 *   className   – extra classes for the outer button element
 *   iconSize    – Tailwind size class for the icon, default "w-4 h-4"
 *   onCopied    – optional callback after a successful copy
 */

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import toast from '@/lib/toast';

interface CopyButtonProps {
  value: string;
  label: string;
  copiedLabel?: string;
  className?: string;
  iconSize?: string;
  onCopied?: () => void;
}

export function CopyButton({
  value,
  label,
  copiedLabel = 'Copied',
  className = 'text-gray-400 hover:text-gray-600',
  iconSize = 'w-4 h-4',
  onCopied,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={copied ? copiedLabel : label}
      className={`shrink-0 ${className}`}
    >
      {copied ? (
        <Check className={`${iconSize} text-green-500`} />
      ) : (
        <Copy className={iconSize} />
      )}
    </button>
  );
}
