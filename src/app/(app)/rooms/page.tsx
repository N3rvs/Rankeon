'use client';

import { CreateRoomDialog } from '@/components/rooms/create-room-dialog';
import { useI18n } from '@/contexts/i18n-context';
import { Dices } from 'lucide-react';

export default function RoomsPage() {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">
            {t('RoomsPage.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('RoomsPage.subtitle')}
          </p>
        </div>
        <CreateRoomDialog />
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center h-[400px]">
        <Dices className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-xl font-semibold">{t('RoomsPage.no_rooms_title')}</h3>
        <p className="mb-4 mt-2 text-sm text-muted-foreground">
          {t('RoomsPage.no_rooms_subtitle')}
        </p>
      </div>
    </div>
  );
}
