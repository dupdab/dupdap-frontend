import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useFocusTrap } from './useFocusTrap';

function Trap({ open }: { open: boolean }) {
  const ref = useFocusTrap<HTMLDivElement>(open);
  return (
    <div>
      <button>outside</button>
      {open && (
        <div ref={ref} tabIndex={-1}>
          <button>first</button>
          <button>last</button>
        </div>
      )}
    </div>
  );
}

describe('useFocusTrap', () => {
  it('focuses the first element and wraps Tab / Shift+Tab', () => {
    render(<Trap open />);
    const first = screen.getByText('first');
    const last = screen.getByText('last');
    expect(document.activeElement).toBe(first);

    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });
});
