import { describe, it, expect, beforeEach } from 'vitest';

import { useUiStore } from './uiStore';

describe('useUiStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useUiStore.setState({
      onboardingDismissed: false,
      helpPanelOpen: false,
    });
  });

  describe('onboardingDismissed', () => {
    it('starts as false', () => {
      expect(useUiStore.getState().onboardingDismissed).toBe(false);
    });

    it('becomes true after dismissOnboarding()', () => {
      useUiStore.getState().dismissOnboarding();
      expect(useUiStore.getState().onboardingDismissed).toBe(true);
    });

    it('persists onboardingDismissed to localStorage under dupdub-ui', () => {
      useUiStore.getState().dismissOnboarding();
      const stored = JSON.parse(localStorage.getItem('dupdub-ui') ?? '{}');
      expect(stored.state.onboardingDismissed).toBe(true);
    });
  });

  describe('helpPanelOpen', () => {
    it('starts as false', () => {
      expect(useUiStore.getState().helpPanelOpen).toBe(false);
    });

    it('can be set to true via setHelpPanelOpen()', () => {
      useUiStore.getState().setHelpPanelOpen(true);
      expect(useUiStore.getState().helpPanelOpen).toBe(true);
    });

    it('can be closed again via setHelpPanelOpen(false)', () => {
      useUiStore.getState().setHelpPanelOpen(true);
      useUiStore.getState().setHelpPanelOpen(false);
      expect(useUiStore.getState().helpPanelOpen).toBe(false);
    });

    it('does not persist helpPanelOpen to localStorage', () => {
      useUiStore.getState().setHelpPanelOpen(true);
      const stored = JSON.parse(localStorage.getItem('dupdub-ui') ?? '{}');
      // Only onboardingDismissed is partialised into storage.
      expect(stored.state?.helpPanelOpen).toBeUndefined();
    });
  });

  describe('store isolation', () => {
    it('does not share state with useAuthStore key', () => {
      useUiStore.getState().dismissOnboarding();
      expect(localStorage.getItem('dupdub-auth')).toBeNull();
      expect(localStorage.getItem('dupdub-ui')).not.toBeNull();
    });

    it('does not share state with useThemeStore key', () => {
      useUiStore.getState().dismissOnboarding();
      expect(localStorage.getItem('dupdub-theme')).toBeNull();
    });
  });
});
