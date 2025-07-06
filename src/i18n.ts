import {notFound} from 'next/navigation';
import {getRequestConfig, getLocale} from 'next-intl/server';
 
// Can be imported from a shared config
const locales = ['en', 'es', 'fr', 'de', 'it', 'pt'];
 
export default getRequestConfig(async () => {
  const locale = await getLocale();
 
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) notFound();
 
  return {
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
