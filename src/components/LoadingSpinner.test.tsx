import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('exposes a status role with the default label', () => {
    render(<LoadingSpinner />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
  });

  it('applies a custom className', () => {
    render(<LoadingSpinner className="custom" />);
    expect(screen.getByRole('status')).toHaveClass('custom');
  });
});
