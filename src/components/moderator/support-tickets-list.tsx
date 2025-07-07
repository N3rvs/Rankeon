// src/components/moderator/support-tickets-list.tsx
'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { SupportTicket } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '../ui/button';
import { Ticket as TicketIcon } from 'lucide-react';
import { Badge } from '../ui/badge';
import { useI18n } from '@/contexts/i18n-context';
import { RespondToTicketDialog } from './RespondToTicketDialog';

function TicketCard({ ticket }: { ticket: SupportTicket }) {
  const { t } = useI18n();
  const [isRespondOpen, setIsRespondOpen] = useState(false);
  const statusText = {
    open: t('SupportTicketsList.status_open'),
    closed: t('SupportTicketsList.status_closed'),
  };

  return (
    <>
      <RespondToTicketDialog ticket={ticket} open={isRespondOpen} onOpenChange={setIsRespondOpen} />
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
              <CardTitle className="capitalize">{ticket.subject.replace(/_/g, ' ')}</CardTitle>
              <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'} className="capitalize">{statusText[ticket.status]}</Badge>
          </div>
          <CardDescription>
            From: {ticket.userName} ({ticket.userEmail})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ticket.description}</p>
        </CardContent>
        <CardFooter className="flex justify-between items-center text-xs text-muted-foreground">
          <span>Submitted {ticket.createdAt ? formatDistanceToNow(ticket.createdAt.toDate(), { addSuffix: true }) : ''}</span>
          <Button size="sm" variant="outline" onClick={() => setIsRespondOpen(true)}>View & Respond</Button>
        </CardFooter>
      </Card>
    </>
  );
}

export function SupportTicketsList() {
  const { t } = useI18n();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'supportTickets'), orderBy('createdAt', 'desc'));
    const unsubscribe: Unsubscribe = onSnapshot(q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket));
        setTickets(data);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching support tickets:', error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center h-[200px]">
        <TicketIcon className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-xl font-semibold">{t('SupportTicketsList.no_tickets_title')}</h3>
        <p className="mt-2 text-muted-foreground">
          {t('SupportTicketsList.no_tickets_desc')}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {tickets.map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)}
    </div>
  );
}
