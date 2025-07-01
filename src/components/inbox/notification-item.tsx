// src/components/inbox/notification-item.tsx
'use client';

import type { Notification, UserProfile } from '@/lib/types';
import { useTransition, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { respondToFriendRequest } from '@/lib/actions/friends';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { cn } from '@/lib/utils';
import {
  UserPlus,
  UserCheck,
  UserX,
  Users,
  Check,
  X,
  MessageSquare,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Skeleton } from '../ui/skeleton';

export function NotificationItem({ notification }: { notification: Notification }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isResponding, startResponding] = useTransition();
  const [fromUser, setFromUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (notification.from) {
      setLoading(true);
      const userDocRef = doc(db, 'users', notification.from);
      getDoc(userDocRef)
        .then((docSnap) => {
          if (docSnap.exists()) {
            setFromUser({ id: docSnap.id, ...docSnap.data() } as UserProfile);
          }
        })
        .catch((error) => console.error("Error fetching user for notification:", error))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [notification.from]);

  const handleResponse = async (accept: boolean) => {
    if (!notification.relatedRequestId) return;
    startResponding(async () => {
      const result = await respondToFriendRequest({
        requestId: notification.relatedRequestId!,
        accept,
      });
      if (result.success) {
        toast({
          title: 'Success',
          description: `Friend request ${accept ? 'accepted' : 'rejected'}.`,
        });
        // Also mark as read after responding
        markAsRead();
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
    if (notification.read || !user) return;
    try {
      const notifRef = doc(
        db,
        'inbox',
        user.uid,
        'notifications',
        notification.id
      );
      await updateDoc(notifRef, { read: true });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const getNotificationDetails = () => {
    const name = fromUser?.name || 'Someone';
    switch (notification.type) {
      case 'friend_request_received':
        return {
          icon: UserPlus,
          message: `${name} sent you a friend request.`,
        };
      case 'friend_request_accepted':
        return {
          icon: UserCheck,
          message: `You are now friends with ${name}.`,
        };
      case 'friend_removed':
        return {
          icon: UserX,
          message: `${name} removed you from their friends.`,
        };
      case 'new_message':
        return {
          icon: MessageSquare,
          message: `New message from ${name}: "${notification.content}"`,
        };
      case 'team_joined':
        return {
          icon: Users,
          message: `You have joined a team.`,
        };
      case 'team_kicked':
        return {
          icon: UserX,
          message: `You have been kicked from a team.`,
        };
      case 'team_invite_received':
         return {
          icon: Users,
          message: `${name} invited you to a team.`,
        };
      default:
        return { icon: Users, message: 'You have a new notification.' };
    }
  };

  if (loading) {
    return <Skeleton className="h-16 w-full p-3 rounded-lg" />;
  }

  const { icon: Icon, message } = getNotificationDetails();

  return (
    <div
      onClick={markAsRead}
      className={cn(
        'flex items-start gap-4 p-3 transition-colors hover:bg-accent rounded-lg cursor-pointer',
        !notification.read && 'bg-primary/5 hover:bg-primary/10'
      )}
    >
      {!notification.read && (
        <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
      )}
      <div
        className={cn(
          'flex items-center gap-3 flex-1',
          notification.read && 'pl-4'
        )}
      >
        <Avatar className="h-10 w-10">
          <AvatarImage
            src={fromUser?.avatarUrl}
            data-ai-hint="person avatar"
          />
          <AvatarFallback>
            {fromUser?.name.slice(0, 2) || <Icon className="h-5 w-5" />}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <p className="text-sm leading-tight">{message}</p>
          <p className="text-xs text-muted-foreground">
            {notification.timestamp
              ? formatDistanceToNow(notification.timestamp.toDate(), {
                  addSuffix: true,
                })
              : ''}
          </p>
          {notification.type === 'friend_request_received' && (
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className="h-7 px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  handleResponse(true);
                }}
                disabled={isResponding}
              >
                <Check className="h-4 w-4 mr-1" /> Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  handleResponse(false);
                }}
                disabled={isResponding}
              >
                <X className="h-4 w-4 mr-1" /> Decline
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
