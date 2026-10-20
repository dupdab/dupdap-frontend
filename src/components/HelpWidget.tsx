'use client';

import { useEffect, useRef, useState } from 'react';
import {
  HelpCircle,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Link2,
  CreditCard,
  Webhook,
  KeyRound,
  Banknote,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFocusTrap } from '@/lib/useFocusTrap';

// ─── FAQ data ──────────────────────────────────────────────────────────────

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  icon: React.ElementType;
  docsUrl?: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'share-payment-link',
    icon: Link2,
    question: 'How do I share a payment link with a customer?',
    answer:
      'Go to Payments → Create Payment, enter the amount and an optional description, then click Create. Copy the generated link and send it to your customer by email, SMS, or any messaging app. The customer lands on a Stellar payment page where they approve and deposit USDC.',
    docsUrl: 'https://docs.dupdub.io/payments/share-link',
  },
  {
    id: 'create-payment',
    icon: CreditCard,
    question: 'How do I create a new payment request?',
    answer:
      'From the Payments page, click "New Payment". Enter the amount in USD and an optional description or customer email. Set an expiry window if needed (defaults to 30 minutes). Once created, the payment appears in your list and a shareable link is available immediately.',
  },
  {
    id: 'settlement',
    icon: Banknote,
    question: 'When do I receive my settlement?',
    answer:
      'Settlements are processed automatically once enough confirmed payments have accumulated. You can track pending and completed settlements on the Settlements page. Settlement payouts go to the bank account configured in Settings.',
  },
  {
    id: 'webhooks',
    icon: Webhook,
    question: 'How do I set up webhooks?',
    answer:
      'Navigate to Webhooks and click "Add Webhook". Paste your endpoint URL and select the events you want to receive (e.g. payment.settled). DupDub will POST a signed JSON payload to your URL on each event. Use the secret shown to verify the signature.',
    docsUrl: 'https://docs.dupdub.io/webhooks',
  },
  {
    id: 'api-key',
    icon: KeyRound,
    question: 'How do I get an API key?',
    answer:
      'Go to Settings → API Keys and click "Generate API Key". Select the scopes you need (read, write, admin). Copy the key immediately — it is only shown once. Store it securely; anyone with the key can act on behalf of your merchant account.',
    docsUrl: 'https://docs.dupdub.io/api-keys',
  },
];

// ─── FAQ accordion item ────────────────────────────────────────────────────

interface FaqRowProps {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
}

function FaqRow({ item, isOpen, onToggle }: FaqRowProps) {
  const Icon = item.icon;
  const answerId = `help-answer-${item.id}`;
  const buttonId = `help-btn-${item.id}`;

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-0">
      <button
        id={buttonId}
        type="button"
        aria-expanded={isOpen}
        aria-controls={answerId}
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
      >
        <Icon
          className="w-4 h-4 shrink-0 text-brand-600 dark:text-brand-400"
          aria-hidden="true"
        />
        <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
          {item.question}
        </span>
        {isOpen ? (
          <ChevronUp
            className="w-4 h-4 shrink-0 text-gray-400"
            aria-hidden="true"
          />
        ) : (
          <ChevronDown
            className="w-4 h-4 shrink-0 text-gray-400"
            aria-hidden="true"
          />
        )}
      </button>
      {isOpen && (
        <div
          id={answerId}
          role="region"
          aria-labelledby={buttonId}
          className="px-4 pb-4"
        >
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed pl-7">
            {item.answer}
          </p>
          {item.docsUrl && (
            <a
              href={item.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 ml-7 inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
            >
              View full docs
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main widget ────────────────────────────────────────────────────────────

/**
 * HelpWidget — a floating help button in the bottom-right corner of the
 * merchant dashboard that opens a panel with answers to common questions.
 *
 * Accessibility:
 * - Toggle button has aria-label and aria-expanded
 * - Panel has role="dialog" and aria-label
 * - Focus is trapped inside the open panel; Escape closes it and restores focus
 * - Each FAQ accordion item uses aria-expanded and aria-controls
 */
export function HelpWidget() {
  const [open, setOpen] = useState(false);
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const panelRef = useFocusTrap<HTMLDivElement>(open);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Escape closes the panel and returns focus to the trigger button.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const toggleFaq = (id: string) =>
    setOpenFaqId((prev) => (prev === id ? null : id));

  return (
    <>
      {/* Floating trigger */}
      <div className="fixed bottom-5 right-5 z-40 print:hidden">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close help' : 'Open help panel'}
          aria-expanded={open}
          aria-haspopup="dialog"
          className={cn(
            'flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-500',
            open
              ? 'bg-brand-700 text-white hover:bg-brand-800'
              : 'bg-brand-600 text-white hover:bg-brand-700'
          )}
        >
          {open ? (
            <X className="w-4 h-4" aria-hidden="true" />
          ) : (
            <HelpCircle className="w-4 h-4" aria-hidden="true" />
          )}
          Help
        </button>
      </div>

      {/* Panel */}
      {open && (
        <>
          {/* Backdrop — closes panel on outside click */}
          <div
            className="fixed inset-0 z-40 print:hidden"
            aria-hidden="true"
            onClick={() => {
              setOpen(false);
              triggerRef.current?.focus();
            }}
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Help — common questions"
            tabIndex={-1}
            className="fixed bottom-20 right-5 z-50 w-[min(92vw,400px)] rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl flex flex-col max-h-[70vh] outline-none print:hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <div className="flex items-center gap-2">
                <HelpCircle
                  className="w-5 h-5 text-brand-600 dark:text-brand-400"
                  aria-hidden="true"
                />
                <h2 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  Help &amp; FAQ
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                aria-label="Close help panel"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* FAQ list */}
            <div
              className="overflow-y-auto flex-1"
              role="list"
              aria-label="Frequently asked questions"
            >
              {FAQ_ITEMS.map((item) => (
                <FaqRow
                  key={item.id}
                  item={item}
                  isOpen={openFaqId === item.id}
                  onToggle={() => toggleFaq(item.id)}
                />
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Can&apos;t find your answer?{' '}
                <a
                  href="mailto:support@dupdub.io"
                  className="text-brand-600 dark:text-brand-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                >
                  Email support
                </a>
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
