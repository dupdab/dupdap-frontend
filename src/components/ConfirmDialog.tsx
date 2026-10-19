'use client';

import { useEffect } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  /** Dialog heading. Defaults to "Are you sure?" */
  title?: string;
  /** Body message / question shown below the heading. */
  message: string;
  /** Label for the confirm button. Defaults to "Confirm". */
  confirmLabel?: string;
  /** Label for the cancel button. Defaults to "Cancel". */
  cancelLabel?: string;
  /** When true, the confirm button uses destructive (red) styling. */
  destructive?: boolean;
  /** When true, both buttons are disabled and confirm shows "Working…". */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Accessible confirmation dialog.
 *
 * Uses `role="alertdialog"` (required by the settings tests for API key
 * generation — see #335) so screen readers interrupt the current reading flow
 * to announce the dialog title and description.
 *
 * Keyboard: Escape closes the dialog via onCancel.
 */
export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Escape key dismisses the dialog (mirrors Modal.tsx / dashboard drawer).
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden="true"
        onClick={loading ? undefined : onCancel}
      />

      {/* Panel */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="relative z-10 w-full max-w-sm rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl"
      >
        <h2
          id="confirm-dialog-title"
          className="text-base font-semibold text-gray-900 dark:text-gray-100"
        >
          {title}
        </h2>
        <p
          id="confirm-dialog-description"
          className="mt-2 text-sm text-gray-600 dark:text-gray-300"
        >
          {message}
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="btn-secondary disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={
              destructive
                ? 'rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50'
                : 'btn-primary disabled:opacity-50'
            }
          >
            {loading ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
