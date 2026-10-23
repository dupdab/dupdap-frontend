'use client';

/**
 * Minimal i18n context for DupDab.
 *
 * Supports English (en), French (fr), Nigerian Pidgin (pcm), and Hausa (ha).
 * No external library is needed — strings are plain objects and the locale is
 * persisted to localStorage so it survives page refreshes.
 *
 * Usage:
 *   const { t, locale, setLocale } = useLocale();
 *   t('dashboard.welcome')  // → translated string
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

export type SupportedLocale = 'en' | 'fr' | 'pcm' | 'ha';

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: 'English',
  fr: 'Français',
  pcm: 'Pidgin',
  ha: 'Hausa',
};

// ---------------------------------------------------------------------------
// Translation map
// ---------------------------------------------------------------------------

type Messages = typeof EN;

const EN = {
  // Navigation
  'nav.overview': 'Overview',
  'nav.payments': 'Payments',
  'nav.settlements': 'Settlements',
  'nav.analytics': 'Analytics',
  'nav.webhooks': 'Webhooks',
  'nav.settings': 'Settings',
  'nav.adminSettlements': 'Admin Settlements',
  'nav.signOut': 'Sign out',
  'nav.tutorial': 'Video tutorial',
  'nav.logout': 'Log out',

  // Dashboard overview
  'dashboard.welcome': 'Welcome back',
  'dashboard.subtitle': "Here's what's happening with your payments",
  'dashboard.totalVolume': 'Total Volume',
  'dashboard.settledPayments': 'Settled Payments',
  'dashboard.pendingPayments': 'Pending Payments',
  'dashboard.totalPayments': 'Total Payments',
  'dashboard.recentPayments': 'Recent Payments',
  'dashboard.noPayments': 'No payments yet',
  'dashboard.loadError': "Couldn't load your dashboard right now.",

  // Payments page
  'payments.title': 'Payments',
  'payments.total': '{count} total payments',
  'payments.new': 'New Payment',
  'payments.createTitle': 'Create Payment',
  'payments.qrTitle': 'Payment QR Code',
  'payments.showQr': 'Show QR',
  'payments.copyMemo': 'Copy memo',
  'payments.copied': 'Copied',
  'payments.copyLink': 'Copy payment link',
  'payments.noPayments': 'No payments yet',
  'payments.col.reference': 'Reference',
  'payments.col.amount': 'Amount',
  'payments.col.status': 'Status',
  'payments.col.created': 'Created',
  'payments.form.amount': 'Amount (USD)',
  'payments.form.description': 'Description (optional)',
  'payments.form.email': 'Customer Email (optional)',
  'payments.form.expiry': 'Expires in (minutes)',
  'payments.form.expiryHint':
    'Must be a whole number between {min} and {max} minutes.',
  'payments.form.submit': 'Create Payment',
  'payments.form.submitting': 'Creating...',
  'payments.loadError': "Couldn't load payments.",

  // Settlements page
  'settlements.title': 'Settlements',
  'settlements.total': '{count} total settlements',
  'settlements.col.id': 'ID',
  'settlements.col.gross': 'Gross',
  'settlements.col.fee': 'Fee',
  'settlements.col.net': 'Net',
  'settlements.col.status': 'Status',
  'settlements.col.date': 'Date',
  'settlements.noSettlements': 'No settlements yet',
  'settlements.loadError': "Couldn't load settlements.",

  // Settings page
  'settings.title': 'Settings',
  'settings.profile': 'Business Profile',
  'settings.save': 'Save changes',
  'settings.saving': 'Saving...',
  'settings.apiKey': 'API Key',
  'settings.apiKeyDesc':
    'Use your API key to authenticate server-side API requests.',
  'settings.generateKey': 'Generate new key',
  'settings.copyKey': 'Copy API key',
  'settings.keyWarning': "Save this key now — it won't be shown again",

  // Pay page (customer-facing)
  'pay.scanInstructions':
    'Scan with a Stellar wallet app, then approve USDC before deposit',
  'pay.depositAddress': 'Deposit address (exact)',
  'pay.copyAddress': 'Copy deposit address',
  'pay.memo': 'Memo',
  'pay.copyMemo': 'Copy memo',
  'pay.expiredLabel': 'This payment request has expired',
  'pay.expiresIn': 'Expires in {time}',
  'pay.loadError': 'Something went wrong loading this payment — try again',
  'pay.notFound': 'Payment not found',
  'pay.calculating': 'Calculating crypto exchange rate…',

  // Analytics
  'analytics.title': 'Analytics',
  'analytics.subtitle': 'Payment volume and status breakdown',

  // Webhooks
  'webhooks.title': 'Webhooks',
  'webhooks.subtitle': 'Get notified when payment events occur',
  'webhooks.add': 'Add Webhook',

  // Common
  'common.loading': 'Loading...',
  'common.retry': 'Retry',
  'common.cancel': 'Cancel',
  'common.prev': 'Prev',
  'common.next': 'Next',
  'common.page': 'Page {page} of {total}',
  'common.language': 'Language',
};

const FR: Messages = {
  'nav.overview': 'Aperçu',
  'nav.payments': 'Paiements',
  'nav.settlements': 'Virements',
  'nav.analytics': 'Analytique',
  'nav.webhooks': 'Webhooks',
  'nav.settings': 'Paramètres',
  'nav.adminSettlements': 'Virements Admin',
  'nav.signOut': 'Se déconnecter',
  'nav.tutorial': 'Vidéo tutorielle',
  'nav.logout': 'Déconnexion',

  'dashboard.welcome': 'Bon retour',
  'dashboard.subtitle': 'Voici ce qui se passe avec vos paiements',
  'dashboard.totalVolume': 'Volume Total',
  'dashboard.settledPayments': 'Paiements Virés',
  'dashboard.pendingPayments': 'Paiements en Attente',
  'dashboard.totalPayments': 'Total Paiements',
  'dashboard.recentPayments': 'Paiements Récents',
  'dashboard.noPayments': 'Aucun paiement',
  'dashboard.loadError': 'Impossible de charger le tableau de bord.',

  'payments.title': 'Paiements',
  'payments.total': '{count} paiements au total',
  'payments.new': 'Nouveau Paiement',
  'payments.createTitle': 'Créer un Paiement',
  'payments.qrTitle': 'QR Code du Paiement',
  'payments.showQr': 'Voir QR',
  'payments.copyMemo': 'Copier le mémo',
  'payments.copied': 'Copié',
  'payments.copyLink': 'Copier le lien de paiement',
  'payments.noPayments': 'Aucun paiement',
  'payments.col.reference': 'Référence',
  'payments.col.amount': 'Montant',
  'payments.col.status': 'Statut',
  'payments.col.created': 'Créé le',
  'payments.form.amount': 'Montant (USD)',
  'payments.form.description': 'Description (optionnel)',
  'payments.form.email': 'Email client (optionnel)',
  'payments.form.expiry': 'Expire dans (minutes)',
  'payments.form.expiryHint':
    'Doit être un nombre entier entre {min} et {max} minutes.',
  'payments.form.submit': 'Créer le Paiement',
  'payments.form.submitting': 'Création...',
  'payments.loadError': 'Impossible de charger les paiements.',

  'settlements.title': 'Virements',
  'settlements.total': '{count} virements au total',
  'settlements.col.id': 'ID',
  'settlements.col.gross': 'Brut',
  'settlements.col.fee': 'Frais',
  'settlements.col.net': 'Net',
  'settlements.col.status': 'Statut',
  'settlements.col.date': 'Date',
  'settlements.noSettlements': 'Aucun virement',
  'settlements.loadError': 'Impossible de charger les virements.',

  'settings.title': 'Paramètres',
  'settings.profile': 'Profil Commercial',
  'settings.save': 'Enregistrer',
  'settings.saving': 'Enregistrement...',
  'settings.apiKey': 'Clé API',
  'settings.apiKeyDesc':
    'Utilisez votre clé API pour authentifier les requêtes serveur.',
  'settings.generateKey': 'Générer une nouvelle clé',
  'settings.copyKey': 'Copier la clé API',
  'settings.keyWarning':
    'Sauvegardez cette clé maintenant — elle ne sera plus affichée',

  'pay.scanInstructions':
    "Scannez avec une application Stellar, puis approuvez l'USDC avant le dépôt",
  'pay.depositAddress': 'Adresse de dépôt (exacte)',
  'pay.copyAddress': "Copier l'adresse",
  'pay.memo': 'Mémo',
  'pay.copyMemo': 'Copier le mémo',
  'pay.expiredLabel': 'Cette demande de paiement a expiré',
  'pay.expiresIn': 'Expire dans {time}',
  'pay.loadError': 'Une erreur est survenue — réessayez',
  'pay.notFound': 'Paiement introuvable',
  'pay.calculating': 'Calcul du taux de change crypto…',

  'analytics.title': 'Analytique',
  'analytics.subtitle': 'Volume de paiement et répartition par statut',

  'webhooks.title': 'Webhooks',
  'webhooks.subtitle': 'Soyez notifié lors des événements de paiement',
  'webhooks.add': 'Ajouter Webhook',

  'common.loading': 'Chargement...',
  'common.retry': 'Réessayer',
  'common.cancel': 'Annuler',
  'common.prev': 'Préc.',
  'common.next': 'Suiv.',
  'common.page': 'Page {page} sur {total}',
  'common.language': 'Langue',
};

const PCM: Messages = {
  'nav.overview': 'Overview',
  'nav.payments': 'Payments',
  'nav.settlements': 'Settlements',
  'nav.analytics': 'Analytics',
  'nav.webhooks': 'Webhooks',
  'nav.settings': 'Settings',
  'nav.adminSettlements': 'Admin Settlements',
  'nav.signOut': 'Sign out',
  'nav.tutorial': 'Video tutorial',
  'nav.logout': 'Log out',

  'dashboard.welcome': 'Welcome back',
  'dashboard.subtitle': 'See wetin dey happen wit your payments',
  'dashboard.totalVolume': 'Total Volume',
  'dashboard.settledPayments': 'Settled Payments',
  'dashboard.pendingPayments': 'Pending Payments',
  'dashboard.totalPayments': 'All Payments',
  'dashboard.recentPayments': 'Recent Payments',
  'dashboard.noPayments': 'No payments yet',
  'dashboard.loadError': 'E no fit load your dashboard now.',

  'payments.title': 'Payments',
  'payments.total': '{count} payments total',
  'payments.new': 'New Payment',
  'payments.createTitle': 'Create Payment',
  'payments.qrTitle': 'Payment QR Code',
  'payments.showQr': 'Show QR',
  'payments.copyMemo': 'Copy memo',
  'payments.copied': 'Copied',
  'payments.copyLink': 'Copy payment link',
  'payments.noPayments': 'No payments yet',
  'payments.col.reference': 'Reference',
  'payments.col.amount': 'Amount',
  'payments.col.status': 'Status',
  'payments.col.created': 'Created',
  'payments.form.amount': 'Amount (USD)',
  'payments.form.description': 'Description (optional)',
  'payments.form.email': 'Customer Email (optional)',
  'payments.form.expiry': 'Expire in (minutes)',
  'payments.form.expiryHint':
    'Make e be whole number between {min} and {max} minutes.',
  'payments.form.submit': 'Create Payment',
  'payments.form.submitting': 'Creating...',
  'payments.loadError': 'E no fit load payments.',

  'settlements.title': 'Settlements',
  'settlements.total': '{count} settlements total',
  'settlements.col.id': 'ID',
  'settlements.col.gross': 'Gross',
  'settlements.col.fee': 'Fee',
  'settlements.col.net': 'Net',
  'settlements.col.status': 'Status',
  'settlements.col.date': 'Date',
  'settlements.noSettlements': 'No settlements yet',
  'settlements.loadError': 'E no fit load settlements.',

  'settings.title': 'Settings',
  'settings.profile': 'Business Profile',
  'settings.save': 'Save changes',
  'settings.saving': 'Saving...',
  'settings.apiKey': 'API Key',
  'settings.apiKeyDesc':
    'Use your API key to authenticate server-side API requests.',
  'settings.generateKey': 'Generate new key',
  'settings.copyKey': 'Copy API key',
  'settings.keyWarning': 'Save this key now — dem no go show am again',

  'pay.scanInstructions':
    'Scan am wit Stellar wallet app, approve USDC before you deposit',
  'pay.depositAddress': 'Deposit address (exact)',
  'pay.copyAddress': 'Copy address',
  'pay.memo': 'Memo',
  'pay.copyMemo': 'Copy memo',
  'pay.expiredLabel': 'This payment don expire',
  'pay.expiresIn': 'Go expire in {time}',
  'pay.loadError': 'Something go wrong — try again',
  'pay.notFound': 'Payment no dey',
  'pay.calculating': 'Dey calculate crypto rate…',

  'analytics.title': 'Analytics',
  'analytics.subtitle': 'Payment volume and status breakdown',

  'webhooks.title': 'Webhooks',
  'webhooks.subtitle': 'Get notification wen payment event happen',
  'webhooks.add': 'Add Webhook',

  'common.loading': 'Loading...',
  'common.retry': 'Try again',
  'common.cancel': 'Cancel',
  'common.prev': 'Prev',
  'common.next': 'Next',
  'common.page': 'Page {page} of {total}',
  'common.language': 'Language',
};

const HA: Messages = {
  'nav.overview': 'Taƙaitawa',
  'nav.payments': 'Biyan Kuɗi',
  'nav.settlements': 'Tsauri',
  'nav.analytics': 'Nazari',
  'nav.webhooks': 'Webhooks',
  'nav.settings': 'Saiti',
  'nav.adminSettlements': 'Tsauri na Admin',
  'nav.signOut': 'Fita',
  'nav.tutorial': 'Koyarwa',
  'nav.logout': 'Fita daga asusun',

  'dashboard.welcome': 'Barka da dawowa',
  'dashboard.subtitle': 'Ga abin da ke faruwa da biyan kuɗinka',
  'dashboard.totalVolume': 'Jimillar Kuɗi',
  'dashboard.settledPayments': 'An Tsaura',
  'dashboard.pendingPayments': 'A Jira',
  'dashboard.totalPayments': 'Duk Biyan Kuɗi',
  'dashboard.recentPayments': 'Biyan Kuɗi na Kwanan nan',
  'dashboard.noPayments': 'Babu biyan kuɗi tukuna',
  'dashboard.loadError': 'Ba a iya loda dashboard yanzu.',

  'payments.title': 'Biyan Kuɗi',
  'payments.total': 'Biyan kuɗi {count}',
  'payments.new': 'Biyan Kuɗi Sabon',
  'payments.createTitle': 'Ƙirƙiri Biyan Kuɗi',
  'payments.qrTitle': 'QR Code na Biyan Kuɗi',
  'payments.showQr': 'Nuna QR',
  'payments.copyMemo': 'Kwafa memo',
  'payments.copied': 'An kwafa',
  'payments.copyLink': 'Kwafa haɗin biyan kuɗi',
  'payments.noPayments': 'Babu biyan kuɗi tukuna',
  'payments.col.reference': 'Tunani',
  'payments.col.amount': 'Adadi',
  'payments.col.status': 'Yanayi',
  'payments.col.created': 'An ƙirƙira',
  'payments.form.amount': 'Adadi (USD)',
  'payments.form.description': 'Bayanai (zaɓi)',
  'payments.form.email': 'Email na Abokin Ciniki (zaɓi)',
  'payments.form.expiry': 'Ya ƙare a (mintuna)',
  'payments.form.expiryHint':
    'Dole ya zama lamba gabaɗaya tsakanin {min} da {max} mintuna.',
  'payments.form.submit': 'Ƙirƙiri Biyan Kuɗi',
  'payments.form.submitting': 'Ƙirƙirawa...',
  'payments.loadError': 'Ba a iya loda biyan kuɗi.',

  'settlements.title': 'Tsauri',
  'settlements.total': 'Tsauri {count}',
  'settlements.col.id': 'ID',
  'settlements.col.gross': 'Jimilla',
  'settlements.col.fee': 'Kuɗin Aiki',
  'settlements.col.net': 'Net',
  'settlements.col.status': 'Yanayi',
  'settlements.col.date': 'Kwanan wata',
  'settlements.noSettlements': 'Babu tsauri tukuna',
  'settlements.loadError': 'Ba a iya loda tsauri.',

  'settings.title': 'Saiti',
  'settings.profile': 'Bayanan Kasuwanci',
  'settings.save': 'Ajiye canje-canje',
  'settings.saving': 'Ana ajiyewa...',
  'settings.apiKey': 'Mabuɗin API',
  'settings.apiKeyDesc':
    'Yi amfani da mabuɗin API don tabbatar da buƙatun uwar garken.',
  'settings.generateKey': 'Ƙirƙiri mabuɗi sabon',
  'settings.copyKey': 'Kwafa mabuɗin API',
  'settings.keyWarning':
    'Adana wannan mabuɗin yanzu — ba za a nuna shi sake ba',

  'pay.scanInstructions': 'Duba da app na Stellar, amince da USDC kafin ajiya',
  'pay.depositAddress': 'Adireshin ajiya (daidai)',
  'pay.copyAddress': 'Kwafa adireshin',
  'pay.memo': 'Memo',
  'pay.copyMemo': 'Kwafa memo',
  'pay.expiredLabel': 'Wannan buƙatar biyan kuɗi ta ƙare',
  'pay.expiresIn': 'Za ta ƙare a {time}',
  'pay.loadError': 'Wani abu ya kasa — sake gwadawa',
  'pay.notFound': 'Ba a sami biyan kuɗin ba',
  'pay.calculating': 'Ana ƙididdige musawarar crypto…',

  'analytics.title': 'Nazari',
  'analytics.subtitle': 'Yawan biyan kuɗi da rarrabuwar yanayi',

  'webhooks.title': 'Webhooks',
  'webhooks.subtitle': "Sami sanarwa idan al'amarin biyan kuɗi ya faru",
  'webhooks.add': 'Ƙara Webhook',

  'common.loading': 'Ana loda...',
  'common.retry': 'Sake gwadawa',
  'common.cancel': 'Soke',
  'common.prev': 'Baya',
  'common.next': 'Gaba',
  'common.page': 'Shafi {page} na {total}',
  'common.language': 'Harshe',
};

const MESSAGES: Record<SupportedLocale, Messages> = {
  en: EN,
  fr: FR,
  pcm: PCM,
  ha: HA,
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface LocaleContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  /** Translate a key, with optional `{placeholder}` interpolation. */
  t: (key: keyof Messages, vars?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => EN[key] ?? key,
});

const STORAGE_KEY = 'dupdab_locale';

function readStoredLocale(): SupportedLocale {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && stored in MESSAGES) return stored as SupportedLocale;
  // Detect browser language as fallback
  const lang = navigator.language.slice(0, 2).toLowerCase();
  if (lang === 'fr') return 'fr';
  if (lang === 'ha') return 'ha';
  return 'en';
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>('en');

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    setLocaleState(readStoredLocale());
  }, []);

  const setLocale = (next: SupportedLocale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
  };

  const t = (
    key: keyof Messages,
    vars?: Record<string, string | number>
  ): string => {
    let msg: string = MESSAGES[locale][key] ?? EN[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        msg = msg.replaceAll(`{${k}}`, String(v));
      }
    }
    return msg;
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
