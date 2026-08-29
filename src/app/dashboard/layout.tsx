'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  CreditCard,
  Banknote,
  Settings,
  LogOut,
  Webhook,
  BarChart3,
  Menu,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export const metadata = {
  robots: { index: false, follow: false },
};

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/payments', label: 'Payments', icon: CreditCard },
  { href: '/dashboard/settlements', label: 'Settlements', icon: Banknote },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/webhooks', label: 'Webhooks', icon: Webhook },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { merchant, token, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!token) {
      const next = pathname ? `?next=${encodeURIComponent(pathname)}` : '';
      router.push(`/auth/login${next}`);
    }
  }, [token, router, pathname]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  if (!merchant) return null;

  const sidebarContent = (
    <>
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <div>
          <span className="font-bold text-brand-600 text-lg">DupDub</span>
          <p className="text-xs text-gray-500 mt-1 truncate">{merchant.businessName}</p>
        </div>
        <button
          onClick={() => setMobileNavOpen(false)}
          className="md:hidden text-gray-400 hover:text-gray-600"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <button
          onClick={() => { logout(); router.push('/auth/login'); }}
          className="flex items-center gap-3 px-3 py-2 text-sm text-gray-500 hover:text-gray-900 w-full rounded-lg hover:bg-gray-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 h-14 bg-white border-b border-gray-200 flex items-center px-4 z-30">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="text-gray-500 hover:text-gray-900"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <span className="font-bold text-brand-600 text-lg ml-3">DupDub</span>
      </div>

      {/* Sidebar - desktop */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col">
        {sidebarContent}
      </aside>

      {/* Sidebar - mobile off-canvas drawer */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative w-64 bg-white border-r border-gray-200 flex flex-col">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0">{children}</main>
    </div>
  );
}
