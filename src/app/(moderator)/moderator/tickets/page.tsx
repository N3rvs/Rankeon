'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft, Ticket } from 'lucide-react';
import { useI18n } from '@/contexts/i18n-context';
import { SupportTicketsList } from '@/components/moderator/support-tickets-list';

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
          <div className="flex items-center gap-4">
            <Ticket className="h-6 w-6 text-primary" />
              <div>
                <CardTitle className="font-headline text-2xl">{t('ModPanel.support_tickets_page_title')}</CardTitle>
                <CardDescription>{t('ModPanel.support_tickets_desc')}</CardDescription>
              </div>
          </div>
        </CardHeader>
        <CardContent>
          <SupportTicketsList />
        </CardContent>
      </Card>
    </div>
  );
}
