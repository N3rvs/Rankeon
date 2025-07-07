'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useI18n } from '@/contexts/i18n-context';
import { Cookie } from 'lucide-react';
import { cn } from '@/lib/utils';

const COOKIE_CONSENT_KEY = 'squadup_cookie_consent';

export function CookieConsentBanner() {
  const { t } = useI18n();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // This effect runs only on the client-side
    const consentValue = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consentValue) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'false');
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={cn(
        "fixed bottom-0 left-0 right-0 z-50 p-4 transition-transform duration-500",
        isVisible ? "translate-y-0" : "translate-y-full"
    )}>
        <Card className="container mx-auto max-w-4xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl">
             <div className="flex items-center gap-3">
                <Cookie className="h-6 w-6 text-primary shrink-0" />
                <p className="text-sm text-card-foreground">
                    {t('CookieBanner.message')}
                </p>
            </div>
            <div className="flex gap-2 shrink-0">
                <Button onClick={handleAccept}>{t('CookieBanner.accept')}</Button>
                <Button variant="outline" onClick={handleDecline}>{t('CookieBanner.decline')}</Button>
            </div>
        </Card>
    </div>
  );
}
