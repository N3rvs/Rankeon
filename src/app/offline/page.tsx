'use client';

import { Button } from '@/components/ui/button';
import { WifiOff } from 'lucide-react';
import Link from 'next/link';
import { PublicLayout } from '@/components/public-layout';

export default function OfflinePage() {
  return (
    <PublicLayout>
      <div className="container mx-auto max-w-md text-center py-20">
        <WifiOff className="h-24 w-24 mx-auto text-muted-foreground mb-6" />
        <h1 className="text-3xl font-bold font-headline mb-4">Vaya, estás sin conexión</h1>
        <p className="text-muted-foreground mb-8">
          Parece que no tienes conexión a internet. No te preocupes, cuando vuelvas a estar en línea, podrás seguir donde lo dejaste.
        </p>
        <Button asChild>
          <Link href="/">Ir al Inicio</Link>
        </Button>
      </div>
    </PublicLayout>
  );
}
