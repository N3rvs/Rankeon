// src/components/inbox/inbox-content.tsx
'use client';

import { useState, useEffect, useTransition } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase/client';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
} from 'firebase/firestore';
import type { Notification } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { markAllAsRead } from '@/lib/actions/notifications';
import { NotificationItem } from './notification-item';
import { ScrollArea } from '../ui/scroll-area';

export function InboxContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notifs = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Notification)
        );
        setNotifications(notifs);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching notifications:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleMarkAllRead = () => {
    startTransition(async () => {
      if (!user) return;
      const unreadIds = notifications
        .filter((n) => !n.read)
        .map((n) => n.id);
      if (unreadIds.length === 0) return;

      const { success, message } = await markAllAsRead(unreadIds);
      if (!success) {
        toast({ title: 'Error', description: message, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'All notifications marked as read.' });
      }
    });
  };

  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold font-headline">Notifications</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={isPending || !hasUnread}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1" style={{ height: '400px' }}>
        <div className="p-2 space-y-1">
          {loading ? (
            <div className="space-y-2 p-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center text-center p-6 text-muted-foreground">
              <Bell className="h-10 w-10" />
              <p className="mt-4 text-sm font-semibold">No new notifications</p>
              <p className="text-xs">
                Friend requests and other updates will appear here.
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
