import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reset password — DupDub',
  robots: { index: false },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
