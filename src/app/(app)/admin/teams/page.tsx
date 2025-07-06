'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft, Swords } from 'lucide-react';
import { useI18n } from '@/contexts/i18n-context';

export default function AdminTeamsPage() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild>
        <Link href="/admin">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('AdminPanel.back_button')}
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline">
            <Swords /> {t('AdminPanel.team_management_page_title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t('AdminPanel.under_construction')}</p>
        </CardContent>
      </Card>
    </div>
  );
}

    