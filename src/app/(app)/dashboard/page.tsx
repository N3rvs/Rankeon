import { MarketTabs } from '@/components/market/market-tabs';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          Player &amp; Team Market
        </h1>
        <p className="text-muted-foreground">
          Find your next teammate or get recruited by a top team.
        </p>
      </div>
      <MarketTabs />
    </div>
  );
}
