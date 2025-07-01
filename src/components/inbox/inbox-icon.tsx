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
import Link from 'next/link';
import { Bell } from 'lucide-react';

export function InboxIcon() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;

    if (user) {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        where('read', '==', false)
      );

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          setUnreadCount(snapshot.size);
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
    <Button asChild variant="ghost" size="icon" className="relative">
      <Link href="/inbox">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        <span className="sr-only">Open Inbox</span>
      </Link>
    </Button>
  );
}
