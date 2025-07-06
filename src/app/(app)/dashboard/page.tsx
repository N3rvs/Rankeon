import { MarketTabs } from '@/components/market/market-tabs';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Mercado de Equipos y Jugadores (UE)",
};

export default async function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          Mercado de Equipos y Jugadores (UE)
        </h1>
        <p className="text-muted-foreground">
          Encuentra equipos y jugadores en la región de la UE.
        </p>
      </div>
      <MarketTabs />
    </div>
  );
}
