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
  Shield,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { isAdmin } from '@/lib/auth';
import { isNavItemActive } from '@/lib/nav-active';
import { cn } from '@/lib/utils';
import { useFocusTrap } from '@/lib/useFocusTrap';
import { useLocale } from '@/lib/locale';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { useAdminGuard, useAdminRedirect } from '@/lib/useAdminGuard';

declare global {
  interface Window {
    /**
     * Set by dashboard forms that have unsaved changes, so the layout can guard
     * browser-level navigation (reload, tab close, external link) (#349).
     */
    __dashboardHasUnsavedChanges?: boolean;
  }
}

const UNSAVED_CHANGES_MESSAGE =
  'You have unsaved changes. Are you sure you want to leave this page?';

function LoadingState() {
  return (
    <div
      role="status"
      className="min-h-screen flex items-center justify-center bg-gray-50"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { merchant, token, logout, hasHydrated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { t } = useLocale();

  // Admin authorization gate: guards admin-only routes without flash of content.
  const adminStatus = useAdminGuard();
  useAdminRedirect(adminStatus);

  // The off-canvas mobile drawer is a modal surface: it reuses the shared
  // focus-trap so focus moves into the drawer on open, Tab cycles inside it,
  // and focus returns to the hamburger button on close (#356).
  const drawerRef = useFocusTrap<HTMLElement>(mobileNavOpen);

  // Nav items are derived inside the component so labels can be translated.
  const navItems = [
    { href: '/dashboard', label: t('nav.overview'), icon: LayoutDashboard, exact: true },
    { href: '/dashboard/payments', label: t('nav.payments'), icon: CreditCard },
    { href: '/dashboard/settlements', label: t('nav.settlements'), icon: Banknote },
    { href: '/dashboard/analytics', label: t('nav.analytics'), icon: BarChart3 },
    { href: '/dashboard/webhooks', label: t('nav.webhooks'), icon: Webhook },
    { href: '/dashboard/settings', label: t('nav.settings'), icon: Settings },
    { href: '/dashboard/admin/settlements', label: t('nav.adminSettlements'), icon: Shield, adminOnly: true },
  ];

  useEffect(() => {
    if (!token) {
      const next = pathname ? `?next=${encodeURIComponent(pathname)}` : '';
      router.push(`/auth/login${next}`);
    }
  }, [token, router, pathname]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  // Escape closes the mobile drawer, matching Modal.tsx / ConfirmDialog.tsx.
  useEffect(() => {
    if (!mobileNavOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMobileNavOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileNavOpen]);

  // Prevent the page behind the drawer from scrolling while it is open.
  useEffect(() => {
    if (!mobileNavOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen]);

  // Warn before browser-level navigation (reload, tab close, external link)
  // while a form inside the dashboard has unsaved changes.
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!window.__dashboardHasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = UNSAVED_CHANGES_MESSAGE;
      return UNSAVED_CHANGES_MESSAGE;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Show a neutral loading state while Zustand rehydrates from localStorage.
  // This prevents both the blank-page flash and the premature redirect.
  if (!hasHydrated) {
    return <LoadingState />;
  }

  // Render an explicit loading state (instead of null) while the redirect
  // effect above navigates unauthenticated users away, avoiding a flash of
  // blank content.
  if (!token || !merchant) {
    return <LoadingState />;
  }

  // The admin routes live under this layout, so an unauthorized merchant is
  // stopped here before `children` is ever returned — the admin page never
  // mounts for them, closing the flash-of-unauthorized-content window (#357).
  if (adminStatus !== 'authorized') {
    return <LoadingState />;
  }

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isAdmin(merchant));

  const confirmNavigation = () => {
    if (!window.__dashboardHasUnsavedChanges) return true;
    return window.confirm(UNSAVED_CHANGES_MESSAGE);
  };

  const handleNavClick = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (pathname === href) return;
    if (!confirmNavigation()) {
      event.preventDefault();
    }
  };

  const sidebarContent = (
    <>
      <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div>
          <span className="font-bold text-brand-600 text-lg">DupDub</span>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{merchant.businessName}</p>
        </div>
        <button
          onClick={() => setMobileNavOpen(false)}
          className="md:hidden text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {visibleNavItems.map(({ href, label, icon: Icon, exact }) => {
          // Segment-aware match so a sibling route that merely shares a
          // prefix (e.g. /dashboard/settlements-export) is not highlighted (#358).
          const active = isNavItemActive(pathname, href, exact);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              onClick={(event) => handleNavClick(event, href)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100',
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
        {/* Language switcher — lets merchants pick English, French, Pidgin, or Hausa */}
        <LocaleSwitcher />
        <button
          onClick={() => {
            if (!confirmNavigation()) return;
            logout();
            router.push('/auth/login');
          }}
          className="flex items-center gap-3 px-3 py-2 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 w-full rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {t('nav.signOut')}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 z-30">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <span className="font-bold text-brand-600 text-lg ml-3">DupDub</span>
      </div>

      {/* Sidebar - desktop */}
      <aside className="hidden md:flex w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-col fixed top-0 bottom-0 left-0">
        {sidebarContent}
      </aside>

      {/* Sidebar - mobile off-canvas drawer */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            tabIndex={-1}
            className="relative w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col outline-none"
          >
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main — offset on desktop to clear the fixed sidebar */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0 md:ml-64 min-w-0">{children}</main>
    </div>
  );
}
