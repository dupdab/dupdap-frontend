'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** When set, the user must type this exact text to enable the confirm button. */
  confirmationText?: string;
  /** Visual emphasis for irreversible actions. */
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  testId?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmationText,
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
  testId = 'confirm-dialog',
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Reset typed confirmation whenever the dialog opens.
  useEffect(() => {
    if (open) setTyped('');
  }, [open]);

  // Focus trap + keyboard dismissal.
  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open, onCancel]);

  if (!open) return null;

  const requiresTyping = Boolean(confirmationText);
  const canConfirm = !requiresTyping || typed === confirmationText;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${testId}-title`}
        aria-describedby={`${testId}-message`}
        data-testid={testId}
        className="bg-white rounded-lg shadow-xl w-full max-w-md p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          {destructive && (
            <div className="flex-shrink-0 rounded-full bg-red-100 p-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 id={`${testId}-title`} className="text-lg font-semibold text-gray-900">
              {title}
            </h2>
            <p id={`${testId}-message`} className="text-sm text-gray-500 mt-2">
              {message}
            </p>
          </div>
        </div>

        {requiresTyping && (
          <div className="mt-4">
            <label htmlFor={`${testId}-confirm-input`} className="block text-sm text-gray-600 mb-1">
              Type <span className="font-mono font-semibold">{confirmationText}</span> to confirm
            </label>
            <input
              id={`${testId}-confirm-input`}
              data-testid={`${testId}-confirm-input`}
              type="text"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              className="input w-full"
            />
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <button
            ref={cancelRef}
            type="button"
            data-testid={`${testId}-cancel`}
            onClick={onCancel}
            className="btn-secondary"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            data-testid={`${testId}-confirm`}
            onClick={onConfirm}
            disabled={!canConfirm || loading}
            className={destructive ? 'btn-danger disabled:opacity-50' : 'btn-primary disabled:opacity-50'}
          >
            {loading ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
