
'use client';

import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { useI18n } from '@/contexts/i18n-context';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function HeaderInstallButton() {
  const { t } = useI18n();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  if (!installPrompt) {
    return null;
  }

  return (
    <Button variant="outline" onClick={handleInstallClick}>
        <Download className="mr-2 h-4 w-4" />
        {t('LandingPage.download_app')}
    </Button>
  );
}
