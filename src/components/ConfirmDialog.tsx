'use client';

import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { useFocusTrap } from '@/components/Modal';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  /** Called when the dialog is dismissed: Cancel button, Escape, or backdrop click. */
  onCancel?: () => void;
  /** Alias for `onCancel` for call sites that name the handler after the close action. */
  onClose?: () => void;
  destructive?: boolean;
  loading?: boolean;
  testId?: string;
  contentClassName?: string;
}

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
  onClose,
  destructive = false,
  loading = false,
  testId,
  contentClassName,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  /** Stable identity for this dialog instance in the shared dialog stack. */
  const dialogIdRef = useRef<symbol>(Symbol('confirm-dialog'));

  // Focus trap, body-scroll lock and focus restore are shared with Modal (#314).
  useFocusTrap(open, panelRef, onCancel, dialogIdRef.current);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={dismiss}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        tabIndex={-1}
        data-testid={testId}
        className={cn('card w-full max-w-sm p-6 outline-none', contentClassName)}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="font-semibold text-lg mb-2">
          {title}
        </h2>
        <div id={messageId} className="text-sm text-gray-600 mb-6">
          {message}
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={cn(
              destructive
                ? 'bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50'
                : 'btn-primary',
            )}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
