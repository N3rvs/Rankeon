
'use client';

import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { useI18n } from '@/contexts/i18n-context';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPwaButton() {
  const { t } = useI18n();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) {
      return;
    }
    // Show the install prompt
    await installPrompt.prompt();
    // Wait for the user to respond to the prompt
    await installPrompt.userChoice;
    // We've used the prompt, and can't use it again, so clear it.
    setInstallPrompt(null);
  };

  if (!installPrompt) {
    return null;
  }

  return (
    <DropdownMenuItem onSelect={handleInstallClick}>
      <Download className="mr-2 h-4 w-4" />
      <span>{t('Sidebar.install_app')}</span>
    </DropdownMenuItem>
  );
}
