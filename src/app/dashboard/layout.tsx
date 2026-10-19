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
  PlayCircle,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { isAdmin } from '@/lib/auth';
import { isNavItemActive } from '@/lib/nav-active';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import WhatsNewBanner from '@/components/WhatsNewBanner';
import { OfflineBanner } from '@/components/OfflineBanner';
import { NotificationCenter } from '@/components/NotificationCenter';
import { useAdminGuard, useAdminRedirect } from '@/lib/useAdminGuard';
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

// Merchant onboarding walkthrough (#582). The video covers registration
// through first payment; the transcript keeps it accessible.
const ONBOARDING_VIDEO_URL = 'https://www.youtube.com/playlist?list=PLdupdup-onboarding';
const ONBOARDING_VIDEO_EMBED_URL =
  'https://www.youtube.com/embed/videoseries?list=PLdupdup-onboarding';
const ONBOARDING_TRANSCRIPT = [
  'Welcome to DupDub. In this walkthrough we take you from registration to your first payment.',
  'Step 1: Create your merchant account and verify your business details.',
  'Step 2: Connect your settlement bank account in Settings.',
  'Step 3: Create an API key and configure your webhook endpoint.',
  'Step 4: Send a test payment from the Payments page and confirm it appears in your dashboard.',
  'That is it — you are ready to accept live payments.',
];

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
  const [tutorialOpen, setTutorialOpen] = useState(false);

  // The admin authorization gate is shared with the admin layout so the
  // decision is made during render, not only by a redirect effect (#357).
  const adminStatus = useAdminGuard();
  useAdminRedirect(adminStatus);
  // The off-canvas mobile drawer is a modal surface: it reuses the shared
  // focus-trap so focus moves into the drawer on open, Tab cycles inside it,
  // and focus returns to the hamburger button on close (#356).
  const drawerRef = useFocusTrap<HTMLElement>(mobileNavOpen);
  // Admin guard — determines whether the current merchant may view admin routes.
  // Must be called unconditionally (Rules of Hooks) even for non-admin paths;
  // useAdminGuard returns 'authorized' for all non-admin paths (#357).
  const adminStatus = useAdminGuard();
  useAdminRedirect(adminStatus);
  const tutorialRef = useFocusTrap<HTMLDivElement>(tutorialOpen);

  // Admin authorization guard — returns 'loading' | 'authorized' | 'unauthorized'.
  // When not on an admin path it always returns 'authorized' immediately, so
  // non-admin routes are unaffected. Replaces the previously-undefined `adminStatus`.
  const adminStatus = useAdminGuard();
  useAdminRedirect(adminStatus);

  // Auth guard (#490): once Zustand has rehydrated, redirect unauthenticated
  // visitors to the login page before any dashboard content is rendered.

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
    if (!hasHydrated) return;
    if (!token) {
      const next = pathname ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`/auth/login${next}`);
    }
  }, [hasHydrated, token, router, pathname]);

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

  // Escape closes the tutorial modal.
  useEffect(() => {
    if (!tutorialOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setTutorialOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [tutorialOpen]);

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
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      <nav aria-label="Main navigation" className="flex-1 p-4 space-y-1 overflow-y-auto">
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
              <Icon className="w-4 h-4" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
        {/* Language switcher — lets merchants pick English, French, Pidgin, or Hausa */}
        <LocaleSwitcher />
        <button
          onClick={() => setTutorialOpen(true)}
          className="flex items-center gap-3 px-3 py-2 text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 w-full rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950 transition-colors"
        >
          <PlayCircle className="w-4 h-4" />
          Watch onboarding tutorial
        </button>
        <ThemeToggle />
        <button
          onClick={() => {
            if (!confirmNavigation()) return;
            logout();
            router.push('/auth/login');
          }}
          aria-label="Sign out"
          className="flex items-center gap-3 px-3 py-2 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 w-full rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          {t('nav.signOut')}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
      {/* Mobile top bar */}
      <header
        role="banner"
        className="md:hidden fixed top-0 inset-x-0 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 z-30 print:hidden"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            aria-label="Open navigation menu"
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-nav-drawer"
          >
            <Menu className="w-6 h-6" aria-hidden="true" />
          </button>
          <span className="font-bold text-brand-600 text-lg" aria-hidden="true">DupDub</span>
        </div>
        <NotificationCenter />
      </header>

      {/* Sidebar - desktop */}
      <aside
        aria-label="Dashboard sidebar"
        className="hidden md:flex w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-col print:hidden"
      >
        {/* Desktop top bar inside sidebar — brand + notifications */}
        <div className="hidden md:flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <span className="font-bold text-brand-600 text-lg">DupDub</span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{merchant.businessName}</p>
          </div>
          <NotificationCenter />
        </div>

        <nav aria-label="Main navigation" className="flex-1 p-4 space-y-1">
          {visibleNavItems.map(({ href, label, icon: Icon, exact }) => {
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
                <Icon className="w-4 h-4" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => {
              if (!confirmNavigation()) return;
              logout();
              router.push('/auth/login');
            }}
            aria-label="Sign out"
            className="flex items-center gap-3 px-3 py-2 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 w-full rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-40 print:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            aria-hidden="true"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <aside
            id="mobile-nav-drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="absolute inset-y-0 left-0 w-64 bg-white dark:bg-gray-900 flex flex-col shadow-xl"
          >
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Onboarding tutorial modal (#582) */}
      {tutorialOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setTutorialOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={tutorialRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-tutorial-title"
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-gray-900 shadow-xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
              <h2
                id="onboarding-tutorial-title"
                className="text-lg font-semibold text-gray-900 dark:text-gray-100"
              >
                Merchant onboarding tutorial
              </h2>
              <button
                onClick={() => setTutorialOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                aria-label="Close tutorial"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
                <iframe
                  src={ONBOARDING_VIDEO_EMBED_URL}
                  title="Merchant onboarding video tutorial"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <a
                href={ONBOARDING_VIDEO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
              >
                <PlayCircle className="w-4 h-4" />
                Open the full playlist on YouTube
              </a>
              <details className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                <summary className="cursor-pointer text-sm font-medium text-gray-900 dark:text-gray-100">
                  Video transcript
                </summary>
                <ol className="mt-2 list-decimal list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  {ONBOARDING_TRANSCRIPT.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ol>
              </details>
            </div>
          </div>
        </div>
      )}

      {/* Main content area — offset on desktop to clear the fixed sidebar */}
      <main
        id="main-content"
        className="flex-1 overflow-auto pt-14 md:pt-0 md:ml-64 min-w-0 print:ml-0 print:pt-0"
        aria-label="Main content"
      >
        <OfflineBanner />
        <WhatsNewBanner />
        {children}
      </main>
    </div>
  );
}
