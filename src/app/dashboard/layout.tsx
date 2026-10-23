'use client';

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
import { authApi } from '@/lib/api';
import { isAdmin } from '@/lib/auth';
import { isNavItemActive } from '@/lib/nav-active';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import WhatsNewBanner from '@/components/WhatsNewBanner';
import { isAdmin } from '@/lib/auth';
import { useLocale } from '@/lib/locale';
import { isNavItemActive } from '@/lib/nav-active';
import { useAuthStore } from '@/lib/store';
import { useAdminGuard, useAdminRedirect } from '@/lib/useAdminGuard';
import { useFocusTrap } from '@/lib/useFocusTrap';
import { cn } from '@/lib/utils';

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
const ONBOARDING_VIDEO_URL =
  'https://www.youtube.com/playlist?list=PLdupdup-onboarding';
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

/**
 * Merchant avatar shown in the dashboard nav (#553). Falls back to the first
 * letter of the business name when no avatar has been uploaded.
 */
function MerchantAvatar({
  avatarUrl,
  name,
  size = 'md',
}: {
  avatarUrl?: string | null;
  name?: string | null;
  size?: 'sm' | 'md';
}) {
  const dimension = size === 'sm' ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-base';
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase();
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name ? `${name} logo` : 'Merchant logo'}
        className={cn(
          dimension,
          'rounded-full object-cover border border-gray-200 dark:border-gray-700'
        )}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        dimension,
        'rounded-full flex items-center justify-center font-semibold bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-200'
      )}
    >
      {initial}
    </span>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { merchant, logout, hasHydrated } = useAuthStore();
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
  const tutorialRef = useFocusTrap<HTMLDivElement>(tutorialOpen);

  // Nav items are derived inside the component so labels can be translated.
  const navItems = [
    {
      href: '/dashboard',
      label: t('nav.overview'),
      icon: LayoutDashboard,
      exact: true,
    },
    { href: '/dashboard/payments', label: t('nav.payments'), icon: CreditCard },
    {
      href: '/dashboard/settlements',
      label: t('nav.settlements'),
      icon: Banknote,
    },
    {
      href: '/dashboard/analytics',
      label: t('nav.analytics'),
      icon: BarChart3,
    },
    { href: '/dashboard/webhooks', label: t('nav.webhooks'), icon: Webhook },
    { href: '/dashboard/settings', label: t('nav.settings'), icon: Settings },
    {
      href: '/dashboard/admin/settlements',
      label: t('nav.adminSettlements'),
      icon: Shield,
      adminOnly: true,
    },
  ];

  useEffect(() => {
    if (!hasHydrated) return;
    if (!merchant) {
      const next = pathname ? `?next=${encodeURIComponent(pathname)}` : '';
      // push (not replace) keeps the dashboard entry in history so a back
      // navigation lands on the page the user came from (#490).
      router.push(`/auth/login${next}`);
    }
  }, [hasHydrated, merchant, router, pathname]);

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
  if (!merchant) {
    return <LoadingState />;
  }

  const visibleNavItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin(merchant)
  );

  const confirmNavigation = () => {
    if (!window.__dashboardHasUnsavedChanges) return true;
    return window.confirm(UNSAVED_CHANGES_MESSAGE);
  };

  const handleNavClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    if (pathname === href) return;
    if (!confirmNavigation()) {
      event.preventDefault();
    }
  };

  const sidebarContent = (
    <>
      <div className="p-6 border-b border-gray-100 dark:border-gray-800">
        <Link href="/dashboard" className="flex items-center gap-3">
          <MerchantAvatar
            avatarUrl={merchant.avatarUrl}
            name={merchant.businessName}
          />
          <span className="text-lg font-bold text-gray-900 dark:text-white truncate">
            {merchant.businessName}
          </span>
        </Link>
      </div>
      <nav className="flex-1 p-4 space-y-1" aria-label="Dashboard">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const active = isNavItemActive(pathname, item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(event) => handleNavClick(event, item.href)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200'
                  : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
              )}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
        <button
          type="button"
          onClick={() => setTutorialOpen(true)}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <PlayCircle className="w-5 h-5" aria-hidden="true" />
          {t('nav.tutorial')}
        </button>
        <button
          type="button"
          onClick={async () => {
            await logout();
            router.replace('/auth/login');
          }}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <LogOut className="w-5 h-5" aria-hidden="true" />
          {t('nav.logout')}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <OfflineBanner />
      <WhatsNewBanner />
      <div className="flex">
        <aside className="hidden lg:flex lg:flex-col w-64 min-h-screen bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800">
          {sidebarContent}
        </aside>

        {mobileNavOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileNavOpen(false)}
              aria-hidden="true"
            />
            <aside
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              className="relative flex flex-col w-64 min-h-full bg-white dark:bg-gray-900"
            >
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="absolute top-4 right-4 p-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
              {sidebarContent}
            </aside>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                aria-label="Open navigation"
              >
                <Menu className="w-5 h-5" aria-hidden="true" />
              </button>
              <MerchantAvatar
                avatarUrl={merchant.avatarUrl}
                name={merchant.businessName}
                size="sm"
              />
              <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {merchant.businessName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <LocaleSwitcher />
              <ThemeToggle />
              <NotificationCenter />
            </div>
          </header>
          <main className="p-4 lg:p-6">{children}</main>
        </div>
      </div>

      <HelpWidget />

      {tutorialOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setTutorialOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={tutorialRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.tutorial')}
            className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6"
          >
            <button
              type="button"
              onClick={() => setTutorialOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Close tutorial"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('nav.tutorial')}
            </h2>
            <div className="aspect-video mb-4">
              <iframe
                src={ONBOARDING_VIDEO_EMBED_URL}
                title={t('nav.tutorial')}
                className="w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <a
              href={ONBOARDING_VIDEO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-brand-600 hover:underline"
            >
              {t('nav.tutorial')}
            </a>
            <ol className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300 list-decimal list-inside">
              {ONBOARDING_TRANSCRIPT.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
