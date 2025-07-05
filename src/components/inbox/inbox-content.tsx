// src/components/inbox/inbox-content.tsx
'use client';

import { useState, useEffect, useTransition } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase/client';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  limit,
  Unsubscribe,
} from 'firebase/firestore';
import type { Notification } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  markAllAsRead,
  clearAllNotifications,
} from '@/lib/actions/notifications';
import { NotificationItem } from './notification-item';
import { ScrollArea } from '../ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

export function InboxContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isClearing, startClearingTransition] = useTransition();

  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;

    if (user) {
      setLoading(true);
      // This is a more robust query. It fetches the latest notifications and we filter client-side.
      // This avoids complex/brittle queries that require specific composite indexes.
      const q = query(
        collection(db, 'inbox', user.uid, 'notifications'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const allNotifs = snapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as Notification)
          );
          // Filter out message notifications on the client side for the popover UI.
          const filteredNotifs = allNotifs.filter(n => n.type !== 'new_message');
          setNotifications(filteredNotifs);
          setLoading(false);
        },
        (error) => {
          console.error('Error fetching notifications:', error);
          setLoading(false);
        }
      );
    } else {
      setNotifications([]);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
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
      }
    });
  };

  const handleClearHistory = () => {
    startClearingTransition(async () => {
      if (!user || notifications.length === 0) return;
      
      const { success, message } = await clearAllNotifications();

      if (success) {
        toast({ title: 'Success', description: message });
      } else {
        toast({ title: 'Error', description: message, variant: 'destructive' });
      }
    });
  };

  const hasUnread = notifications.some((n) => !n.read);

  return (
    <TooltipProvider>
      <div className="flex flex-col max-h-[80vh] md:max-h-[500px] w-[90vw] max-w-sm">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold font-headline">
              Notifications
            </h3>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={isPending || !hasUnread}
              >
                <CheckCheck className="mr-2 h-4 w-4" />
                Mark all as read
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={handleClearHistory}
                    disabled={isClearing || notifications.length === 0}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Clear history</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Clear all notifications</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
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
                <p className="mt-4 text-sm font-semibold">No notifications</p>
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
    </TooltipProvider>
  );
}
