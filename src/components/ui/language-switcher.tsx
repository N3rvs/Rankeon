
"use client"

import * as React from "react"
import { Globe } from "lucide-react"

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
  const [isPending, startTransition] = React.useTransition();
  const [locale, setLocale] = React.useState('es');

  // This is a mock implementation since next-intl is removed.
  // In a real scenario, you'd need a different way to handle locales.
  function onSelectChange(value: string) {
    startTransition(() => {
      // This won't actually change the language anymore,
      // as the i18n logic has been removed.
      setLocale(value);
    });
  }

  const languages: {[key: string]: string} = {
    en: "English",
    es: "Español",
    fr: "Français",
    de: "Deutsch",
    it: "Italiano",
    pt: "Português"
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={true}>
          <Globe className="h-5 w-5" />
          <span className="sr-only">Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Seleccionar Idioma</DropdownMenuLabel>
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
