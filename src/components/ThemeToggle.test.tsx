import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ThemeToggle } from './ThemeToggle';
import { useThemeStore } from '@/lib/themeStore';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  // Reset theme store to default
  useThemeStore.setState({ theme: 'system' });
});

describe('ThemeToggle', () => {
  it('renders three theme buttons', () => {
    render(<ThemeToggle />);
    expect(screen.getByTestId('theme-light')).toBeInTheDocument();
    expect(screen.getByTestId('theme-dark')).toBeInTheDocument();
    expect(screen.getByTestId('theme-system')).toBeInTheDocument();
  });

  it('marks the active theme button as pressed', () => {
    useThemeStore.setState({ theme: 'dark' });
    render(<ThemeToggle />);
    expect(screen.getByTestId('theme-dark')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('theme-light')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('theme-system')).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls setTheme when a button is clicked', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByTestId('theme-dark'));
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('switches from dark back to light', () => {
    useThemeStore.setState({ theme: 'dark' });
    render(<ThemeToggle />);
    fireEvent.click(screen.getByTestId('theme-light'));
    expect(useThemeStore.getState().theme).toBe('light');
  });

  it('all buttons have accessible labels', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'Light theme' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dark theme' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'System theme' })).toBeInTheDocument();
  });
});
