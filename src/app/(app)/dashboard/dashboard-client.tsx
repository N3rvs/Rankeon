'use client';

import { MarketTabs } from '@/components/market/market-tabs';
import { useI18n } from '@/contexts/i18n-context';

export function DashboardPageClient() {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          {t('DashboardPage.title')}
        </h1>
        <p className="text-muted-foreground">
          {t('DashboardPage.subtitle')}
        </p>
      </div>
      <MarketTabs />
    </div>
  );
}
