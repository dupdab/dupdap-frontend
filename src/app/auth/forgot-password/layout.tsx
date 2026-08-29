import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Forgot password — DupDub',
  robots: { index: false },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
