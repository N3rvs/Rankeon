'use client';
import { useI18n } from '@/contexts/i18n-context';
import { MessageSquare } from 'lucide-react';

export default function MessagesPage() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
        <MessageSquare className="h-16 w-16 mb-4" />
        <h2 className="text-2xl font-bold">{t('MessagesPage.select_chat_title')}</h2>
        <p>{t('MessagesPage.select_chat_subtitle')}</p>
    </div>
  );
}
