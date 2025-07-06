import { MarketTabs } from '@/components/market/market-tabs';
import {getTranslations} from 'next-intl/server';

export async function generateMetadata({params: {locale}}: {params: {locale: string}}) {
  const t = await getTranslations({locale, namespace: 'DashboardPage'});
 
  return {
    title: t('title')
  };
}

export default async function DashboardPage({params: {locale}}: {params: {locale: string}}) {
  const t = await getTranslations('DashboardPage');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          {t('title')}
        </h1>
        <p className="text-muted-foreground">
          {t('description')}
        </p>
      </div>
      <MarketTabs />
    </div>
  );
}
