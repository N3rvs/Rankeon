'use client';

import { useState } from 'react';
import { useCookieConsent } from '@/contexts/cookie-consent-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Cookie } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/contexts/i18n-context';

export function CookieConsentBanner() {
  const { t } = useI18n();
  const { hasMadeChoice, acceptAll, declineAll, updateConsent, consent } = useCookieConsent();
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [localAnalytics, setLocalAnalytics] = useState(consent.analytics);

  const handleSavePreferences = () => {
    updateConsent({ analytics: localAnalytics });
    setIsCustomizeOpen(false);
  };
  
  const handleOpenCustomize = () => {
    setLocalAnalytics(consent.analytics); // Reset local state on open
    setIsCustomizeOpen(true);
  }

  if (hasMadeChoice) {
    return null;
  }

  return (
    <>
      <div className={cn(
          "fixed bottom-0 left-0 right-0 z-50 p-4 transition-transform duration-500",
          !hasMadeChoice ? "translate-y-0" : "translate-y-full"
      )}>
          <Card className="container mx-auto max-w-4xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl">
              <div className="flex items-center gap-3">
                  <Cookie className="h-6 w-6 text-primary shrink-0" />
                  <p className="text-sm text-card-foreground">
                      {t('CookieBanner.message')}
                  </p>
              </div>
              <div className="flex gap-2 shrink-0">
                  <Button onClick={acceptAll}>{t('CookieBanner.accept')}</Button>
                  <Button variant="secondary" onClick={handleOpenCustomize}>{t('CookieBanner.customize')}</Button>
                  <Button variant="outline" onClick={declineAll}>{t('CookieBanner.decline')}</Button>
              </div>
          </Card>
      </div>
      
      <Dialog open={isCustomizeOpen} onOpenChange={setIsCustomizeOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{t('CookieCustomize.title')}</DialogTitle>
                <DialogDescription>{t('CookieCustomize.description')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div>
                    <h4 className="font-semibold">{t('CookieCustomize.necessary_title')}</h4>
                    <p className="text-sm text-muted-foreground">{t('CookieCustomize.necessary_desc')}</p>
                    <div className="flex items-center justify-end mt-2">
                        <Label htmlFor="necessary-cookies" className="text-sm mr-2">{t('CookieCustomize.always_on')}</Label>
                        <Switch id="necessary-cookies" checked disabled />
                    </div>
                </div>
                <Separator />
                <div>
                    <h4 className="font-semibold">{t('CookieCustomize.analytics_title')}</h4>
                    <p className="text-sm text-muted-foreground">{t('CookieCustomize.analytics_desc')}</p>
                    <div className="flex items-center justify-end mt-2">
                        <Label htmlFor="analytics-cookies" className="text-sm mr-2">{localAnalytics ? 'On' : 'Off'}</Label>
                         <Switch
                            id="analytics-cookies"
                            checked={localAnalytics}
                            onCheckedChange={setLocalAnalytics}
                        />
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button onClick={handleSavePreferences}>{t('CookieCustomize.save')}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
