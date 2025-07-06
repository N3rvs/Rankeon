"use client"

import * as React from "react"
import { Globe } from "lucide-react"
import {useLocale, useTranslations} from 'next-intl';
import {useRouter, usePathname} from 'next-intl/navigation';
import {useTransition} from 'react';

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function LanguageSwitcher() {
  const t = useTranslations('LanguageSwitcher');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function onSelectChange(value: string) {
    startTransition(() => {
      router.replace(pathname, {locale: value});
    });
  }

  const languages: {[key: string]: string} = {
    en: t('en'),
    es: t('es'),
    fr: t('fr'),
    de: t('de'),
    it: t('it'),
    pt: t('pt'),
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isPending}>
          <Globe className="h-5 w-5" />
          <span className="sr-only">Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('label')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={locale} onValueChange={onSelectChange}>
          {Object.entries(languages).map(([lang, name]) => (
             <DropdownMenuRadioItem key={lang} value={lang}>{name}</DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
