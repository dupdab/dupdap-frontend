import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  /** Accessible label announced to screen readers. */
  label?: string;
  /** Show the label visibly next to the spinner. */
  showLabel?: boolean;
  className?: string;
}

export function LoadingSpinner({
  label = 'Loading…',
  showLabel = false,
  className,
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('inline-flex items-center justify-center gap-2', className)}
    >
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      {showLabel ? (
        <span>{label}</span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </div>
  );
}

export default LoadingSpinner;
