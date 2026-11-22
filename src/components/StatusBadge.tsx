'use client';

import React from 'react';
import { STATUS_COLORS, STATUS_ICONS, DEFAULT_STATUS_COLOR, cn } from '@/lib/utils';

export interface StatusBadgeProps {
  status: string;
  className?: string;
  label?: string;
}

export default function StatusBadge({ status, className, label }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();
  const colorClass = STATUS_COLORS[normalizedStatus] || DEFAULT_STATUS_COLOR;
  const Icon = STATUS_ICONS[normalizedStatus];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
        colorClass,
        className
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5" aria-hidden="true" />}
      <span>{label || status.replace(/_/g, ' ')}</span>
    </span>
  );
}
