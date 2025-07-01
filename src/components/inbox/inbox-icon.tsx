// src/components/inbox/inbox-icon.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  collection,
  query,
  where,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { InboxContent } from './inbox-content';
import { cn } from '@/lib/utils';
import type { Notification } from '@/lib/types';

export function InboxIcon() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;

    if (user) {
      // We query for all unread notifications
      const q = query(
        collection(db, 'inbox', user.uid, 'notifications'),
        where('read', '==', false)
      );

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          // Then, we filter out the 'new_message' type on the client side.
          // This is more robust and avoids needing a composite index in Firestore.
          const nonMessageNotifications = snapshot.docs.filter(
            (doc) => (doc.data() as Notification).type !== 'new_message'
          );
          setUnreadCount(nonMessageNotifications.length);
        },
        (error) => {
          console.error('Error fetching unread notifications count:', error);
        }
      );
    } else {
      setUnreadCount(0);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon">
          <div className={cn('relative', unreadCount > 0 && 'animate-ring')}>
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-[-4px] right-[-4px] block h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
            )}
          </div>
          <span className="sr-only">Open Inbox</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[90vw] max-w-sm p-0" align="end">
        <InboxContent />
      </PopoverContent>
    </Popover>
  );
}
