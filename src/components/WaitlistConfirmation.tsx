'use client';

import { useState } from 'react';
import { Check, Copy, MessageCircle, Twitter } from 'lucide-react';
import { buildTwitterShareUrl, buildWhatsAppShareUrl } from '@/lib/waitlist-share';

interface WaitlistConfirmationProps {
  position: number | null;
  referralLink: string;
}

export function WaitlistConfirmation({ position, referralLink }: WaitlistConfirmationProps) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="mt-6 space-y-4 text-left" data-testid="waitlist-confirmation">
      {position !== null && (
        <p className="text-center text-sm text-gray-700">
          Your position: <span className="font-bold text-brand-600">#{position}</span>
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <a
          href={buildTwitterShareUrl(referralLink)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary inline-flex items-center justify-center gap-2"
        >
          <Twitter className="w-4 h-4" aria-hidden="true" />
          Share on X
        </a>
        <a
          href={buildWhatsAppShareUrl(referralLink)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary inline-flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-4 h-4" aria-hidden="true" />
          WhatsApp
        </a>
      </div>
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <p className="text-xs text-gray-500 mb-1">Share your referral link to move up the waitlist</p>
        <div className="flex items-center gap-2">
          <code className="text-xs font-mono break-all flex-1 text-gray-900">{referralLink}</code>
          <button type="button" onClick={copyLink} aria-label="Copy referral link" className="shrink-0">
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
          </button>
        </div>
      </div>
    </div>
  );
}
