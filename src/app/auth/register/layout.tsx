import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create account — DupDub',
  robots: { index: false },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
