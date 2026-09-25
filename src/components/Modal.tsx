'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  testId?: string;
  contentClassName?: string;
}

/** Selector for all focusable elements, used by the focus trap. */
export const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Shared focus-trap / focus-restore logic used by Modal and ConfirmDialog (#314).
 *
 * When `open` becomes true it saves the currently-focused (triggering) element,
 * moves focus into `panelRef`, traps Tab / Shift+Tab within the panel, and on
 * close restores focus to the triggering element.
 */
export function useFocusTrap(
  open: boolean,
  panelRef: React.RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  /** Remembers the element that had focus before the dialog opened so we can restore it on close. */
  const triggerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;

    // Save the currently-focused element so we can restore it on close.
    triggerRef.current = document.activeElement;

    // Move focus into the panel on open.
    panelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Focus trap: cycle focus within the panel on Tab / Shift+Tab.
      if (e.key === 'Tab') {
        const panel = panelRef.current;
        if (!panel) return;
        const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS));
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || document.activeElement === panel) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || document.activeElement === panel) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      // Restore focus to the triggering element when the dialog closes.
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
    };
  }, [open, panelRef, onClose]);
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  testId,
  contentClassName,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useFocusTrap(open, panelRef, onClose);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        data-testid={testId}
        className={cn('card w-full max-w-md p-6 outline-none', contentClassName)}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-lg">{title}</h2>
            {/* aria-label="Close dialog" gives screen readers an unambiguous action name (#161) */}
            <button type="button" onClick={onClose} aria-label="Close dialog">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
