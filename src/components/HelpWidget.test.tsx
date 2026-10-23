import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { HelpWidget } from '../components/HelpWidget';

describe('HelpWidget', () => {
  it('renders a help button in the document', () => {
    render(<HelpWidget />);
    expect(
      screen.getByRole('button', { name: /open help panel/i })
    ).toBeInTheDocument();
  });

  it('does not show the panel initially', () => {
    render(<HelpWidget />);
    expect(
      screen.queryByRole('dialog', { name: /help/i })
    ).not.toBeInTheDocument();
  });

  it('opens the help panel when the trigger is clicked', () => {
    render(<HelpWidget />);
    fireEvent.click(screen.getByRole('button', { name: /open help panel/i }));
    expect(screen.getByRole('dialog', { name: /help/i })).toBeInTheDocument();
  });

  it('closes the panel when the X button is clicked', () => {
    render(<HelpWidget />);
    fireEvent.click(screen.getByRole('button', { name: /open help panel/i }));
    fireEvent.click(
      screen.getByRole('button', { name: /^close help panel$/i })
    );
    expect(
      screen.queryByRole('dialog', { name: /help/i })
    ).not.toBeInTheDocument();
  });

  it('closes the panel when Escape is pressed', () => {
    render(<HelpWidget />);
    fireEvent.click(screen.getByRole('button', { name: /open help panel/i }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(
      screen.queryByRole('dialog', { name: /help/i })
    ).not.toBeInTheDocument();
  });

  it('renders FAQ items in the open panel', () => {
    render(<HelpWidget />);
    fireEvent.click(screen.getByRole('button', { name: /open help panel/i }));
    expect(
      screen.getByText(/how do i share a payment link/i)
    ).toBeInTheDocument();
  });

  it('expands an FAQ item when clicked and collapses it again', () => {
    render(<HelpWidget />);
    fireEvent.click(screen.getByRole('button', { name: /open help panel/i }));

    const faqBtn = screen.getByRole('button', {
      name: /how do i share a payment link/i,
    });
    expect(faqBtn).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(faqBtn);
    expect(faqBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/go to payments/i)).toBeInTheDocument();

    fireEvent.click(faqBtn);
    expect(faqBtn).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows the support email link in the footer', () => {
    render(<HelpWidget />);
    fireEvent.click(screen.getByRole('button', { name: /open help panel/i }));
    expect(
      screen.getByRole('link', { name: /email support/i })
    ).toHaveAttribute('href', 'mailto:support@dupdub.io');
  });

  it('closes the panel when the backdrop is clicked', () => {
    render(<HelpWidget />);
    fireEvent.click(screen.getByRole('button', { name: /open help panel/i }));
    // The backdrop is the sibling div before the panel
    const dialog = screen.getByRole('dialog', { name: /help/i });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const backdrop = dialog.previousElementSibling!;
    fireEvent.click(backdrop);
    expect(
      screen.queryByRole('dialog', { name: /help/i })
    ).not.toBeInTheDocument();
  });

  it('sets aria-expanded on the trigger when panel is open', () => {
    render(<HelpWidget />);
    const trigger = screen.getByRole('button', { name: /open help panel/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    // After opening, the trigger label changes to 'Close help'
    expect(
      screen.getByRole('button', { name: /^close help$/i })
    ).toHaveAttribute('aria-expanded', 'true');
  });
});
