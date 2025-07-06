'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft, Ticket } from 'lucide-react';
import { useI18n } from '@/contexts/i18n-context';

export default function ModeratorTicketsPage() {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild>
        <Link href="/moderator">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('ModPanel.back_button')}
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline">
            <Ticket /> {t('ModPanel.support_tickets_page_title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t('AdminPanel.under_construction')}</p>
        </CardContent>
      </Card>
    </div>
  );
}

    