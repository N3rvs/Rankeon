
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const countryCodeMap: { [key: string]: string } = {
  'Albania': 'AL',
  'Andorra': 'AD',
  'Austria': 'AT',
  'Belarus': 'BY',
  'Belgium': 'BE',
  'Bosnia and Herzegovina': 'BA',
  'Bulgaria': 'BG',
  'Croatia': 'HR',
  'Cyprus': 'CY',
  'Czech Republic': 'CZ',
  'Denmark': 'DK',
  'Estonia': 'EE',
  'Finland': 'FI',
  'France': 'FR',
  'Germany': 'DE',
  'Greece': 'GR',
  'Hungary': 'HU',
  'Iceland': 'IS',
  'Ireland': 'IE',
  'Italy': 'IT',
  'Latvia': 'LV',
  'Liechtenstein': 'LI',
  'Lithuania': 'LT',
  'Luxembourg': 'LU',
  'Malta': 'MT',
  'Moldova': 'MD',
  'Monaco': 'MC',
  'Montenegro': 'ME',
  'Netherlands': 'NL',
  'North Macedonia': 'MK',
  'Norway': 'NO',
  'Poland': 'PL',
  'Portugal': 'PT',
  'Romania': 'RO',
  'Russia': 'RU',
  'San Marino': 'SM',
  'Serbia': 'RS',
  'Slovakia': 'SK',
  'Slovenia': 'SI',
  'Spain': 'ES',
  'Sweden': 'SE',
  'Switzerland': 'CH',
  'Ukraine': 'UA',
  'United Kingdom': 'GB',
  'Vatican City': 'VA'
};

function countryCodeToEmoji(code: string): string {
    const OFFSET = 127397;
    const chars = code.toUpperCase().split('').map(char => char.charCodeAt(0) + OFFSET);
    return String.fromCodePoint(...chars);
}

export function getFlagEmoji(countryName: string): string {
  if (!countryName) return '';
  const countryCode = countryCodeMap[countryName];
  if (!countryCode) return '🏳️';
  return countryCodeToEmoji(countryCode);
}
