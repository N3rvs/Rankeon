
'use client';

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n, type Locale } from "@/contexts/i18n-context";
import { Globe } from 'lucide-react';
import { useRouter } from "next/navigation";

const languages: { code: Locale, name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
];

export function LanguageSwitcher() {
  const { t, setLocale } = useI18n();
  const router = useRouter();

  const handleLocaleChange = (newLocale: Locale) => {
    // Set the cookie via the context provider which handles it
    setLocale(newLocale);
    // Refresh the page to re-render server components with the new locale
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('LanguageSwitcher.change_language')}>
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem key={lang.code} onSelect={() => handleLocaleChange(lang.code)}>
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
