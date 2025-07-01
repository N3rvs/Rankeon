// src/app/(app)/inbox/page.tsx
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
  doc,
  updateDoc,
} from 'firebase/firestore';
import type { Notification } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bell,
  UserPlus,
  UserCheck,
  UserX,
  Users,
  Check,
  X,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { respondToFriendRequest } from '@/lib/actions/friends';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { markAllAsRead } from '@/lib/actions/notifications';
import { cn } from '@/lib/utils';

export default function InboxPage() {
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
      orderBy('createdAt', 'desc')
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
        toast({
          title: 'Error',
          description: 'Could not load notifications.',
          variant: 'destructive',
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, toast]);

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

  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">
            Inbox
          </h1>
          <p className="text-muted-foreground">
            Your recent social notifications.
          </p>
        </div>
        <Button
          onClick={handleMarkAllRead}
          disabled={isPending || !hasUnread}
        >
          {isPending ? 'Marking...' : 'Mark All as Read'}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-4 p-6">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center text-center p-6">
              <Bell className="h-12 w-12 text-muted-foreground" />
              <p className="mt-4 font-semibold">Your inbox is empty</p>
              <p className="text-sm text-muted-foreground">
                Friend requests and other notifications will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationItem({ notification }: { notification: Notification }) {
  const { toast } = useToast();
  const [isResponding, startResponding] = useTransition();

  const handleResponse = async (response: 'accepted' | 'rejected') => {
    if (!notification.relatedRequestId) return;
    startResponding(async () => {
      const result = await respondToFriendRequest({
        requestId: notification.relatedRequestId!,
        response,
      });
      if (result.success) {
        toast({
          title: 'Success',
          description: `Friend request ${response}.`,
        });
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    });
  };

  const markAsRead = async () => {
    if (notification.read) return;
    const notifRef = doc(db, 'notifications', notification.id);
    await updateDoc(notifRef, { read: true });
  };

  const Icon = {
    friend_request_received: UserPlus,
    friend_request_accepted: UserCheck,
    friend_removed: UserX,
    team_joined: Users,
    team_left: Users,
    team_kicked: Users,
    team_invite_received: Users,
  }[notification.type];

  return (
    <div
      onClick={markAsRead}
      className={cn(
        'flex items-start gap-4 p-4 transition-colors hover:bg-accent',
        !notification.read && 'bg-primary/5 hover:bg-primary/10'
      )}
    >
      {!notification.read && (
        <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
      )}
      <div
        className={cn(
          'flex items-center gap-4 flex-1',
          notification.read && 'pl-4'
        )}
      >
        <Avatar className="h-10 w-10">
          <AvatarImage
            src={notification.fromUser?.avatarUrl}
            data-ai-hint="person avatar"
          />
          <AvatarFallback>
            {notification.fromUser?.name.slice(0, 2) || <Icon />}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="text-sm">{notification.message}</p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(notification.createdAt.toDate(), {
              addSuffix: true,
            })}
          </p>
        </div>
        {notification.type === 'friend_request_received' && (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handleResponse('accepted')}
              disabled={isResponding}
            >
              <Check className="h-4 w-4" /> Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleResponse('rejected')}
              disabled={isResponding}
            >
              <X className="h-4 w-4" /> Decline
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
