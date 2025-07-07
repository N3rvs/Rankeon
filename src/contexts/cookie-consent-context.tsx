'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getAnalytics, setAnalyticsCollectionEnabled } from 'firebase/analytics';
import { app } from '@/lib/firebase/client';

const COOKIE_CONSENT_STATE_KEY = 'squadup_cookie_consent_v2';

interface ConsentState {
  necessary: true;
  analytics: boolean;
}

const defaultConsent: ConsentState = {
  necessary: true,
  analytics: false,
};

interface CookieConsentContextType {
  consent: ConsentState;
  hasMadeChoice: boolean;
  updateConsent: (newConsent: Partial<ConsentState>) => void;
  acceptAll: () => void;
  declineAll: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<ConsentState>(defaultConsent);
  const [hasMadeChoice, setHasMadeChoice] = useState(true); // Assume true initially to hide banner

  useEffect(() => {
    const savedConsent = localStorage.getItem(COOKIE_CONSENT_STATE_KEY);
    if (savedConsent) {
      const parsedConsent = JSON.parse(savedConsent);
      setConsent({ ...defaultConsent, ...parsedConsent });
      setHasMadeChoice(true);
    } else {
      setHasMadeChoice(false);
    }
  }, []);

  useEffect(() => {
    // This effect synchronizes Firebase Analytics with the user's consent.
    try {
        const analytics = getAnalytics(app);
        setAnalyticsCollectionEnabled(analytics, consent.analytics);
    } catch (error) {
        console.error("Failed to initialize or set Firebase Analytics:", error);
    }
  }, [consent.analytics]);

  const updateConsentState = (newConsent: ConsentState) => {
    setConsent(newConsent);
    localStorage.setItem(COOKIE_CONSENT_STATE_KEY, JSON.stringify(newConsent));
    setHasMadeChoice(true);
  };

  const updateConsent = (newConsent: Partial<ConsentState>) => {
    const updated = { ...consent, ...newConsent, necessary: true };
    updateConsentState(updated);
  };

  const acceptAll = () => {
    const allConsent: ConsentState = { necessary: true, analytics: true };
    updateConsentState(allConsent);
  };

  const declineAll = () => {
    const noConsent: ConsentState = { necessary: true, analytics: false };
    updateConsentState(noConsent);
  };

  const value = { consent, hasMadeChoice, updateConsent, acceptAll, declineAll };

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  if (context === undefined) {
    throw new Error('useCookieConsent must be used within a CookieConsentProvider');
  }
  return context;
}
