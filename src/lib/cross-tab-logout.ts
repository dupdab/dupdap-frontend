import { useAuthStore } from './store';

/** Must match the `name` option of the persist middleware in store.ts. */
const AUTH_STORAGE_KEY = 'dupdub-auth';

function hasToken(raw: string | null): boolean {
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as { state?: { token?: unknown } };
    return Boolean(parsed?.state?.token);
  } catch {
    return false;
  }
}

/**
 * Logs this tab out when another tab removes or clears the persisted auth
 * state (#760). The `storage` event only fires in *other* tabs, so this never
 * re-triggers the tab that performed the logout. Local state is cleared
 * directly (no API call) because the originating tab already blacklisted the
 * token. Returns an unsubscribe function.
 */
export function startCrossTabLogoutListener(): () => void {
  if (typeof window === 'undefined') return () => {};

  const onStorage = (event: StorageEvent) => {
    // key === null means localStorage.clear() was called in another tab.
    if (event.key !== null && event.key !== AUTH_STORAGE_KEY) return;
    if (hasToken(event.newValue)) return;

    const { token, merchant } = useAuthStore.getState();
    if (token === null && merchant === null) return;
    useAuthStore.setState({ token: null, merchant: null });
  };

  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}
