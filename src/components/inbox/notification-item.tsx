// src/components/inbox/notification-item.tsx
'use client';

import type { Notification, UserProfile } from '@/lib/types';
import { useTransition, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { respondToFriendRequest } from '@/lib/actions/friends';
import {
  doc,
  updateDoc,
  getDoc,
  query,
  collection,
  where,
  getDocs,
} from 'firebase/firestore';
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
import { useRouter } from 'next/navigation';
import { clearNotificationHistory } from '@/lib/actions/notifications';

export function NotificationItem({
  notification,
}: {
  notification: Notification;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isResponding, startResponding] = useTransition();
  const [isActionTaken, setIsActionTaken] = useState(false);
  const [fromUser, setFromUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchFromUser = async () => {
      if (!notification.from) {
        if (isMounted) setLoading(false);
        return;
      }
      try {
        const userDocRef = doc(db, 'users', notification.from);
        const docSnap = await getDoc(userDocRef);
        if (isMounted) {
          if (docSnap.exists()) {
            setFromUser({ id: docSnap.id, ...docSnap.data() } as UserProfile);
          } else {
            setFromUser(null);
          }
        }
      } catch (error) {
        console.error('Error fetching user for notification:', error);
        if (isMounted) setFromUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFromUser();
    
    return () => {
      isMounted = false;
    };
  }, [notification.id, notification.from]);

  const handleResponse = async (accept: boolean) => {
    if (!user || !notification.from) return;

    let requestId = notification.extraData?.requestId;

    // If the notification doesn't have the ID, find it manually.
    if (!requestId && notification.type === 'friend_request') {
      try {
        const q = query(
          collection(db, "friendRequests"),
          where("from", "==", notification.from),
          where("to", "==", user.uid),
          where("status", "==", "pending")
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          requestId = querySnapshot.docs[0].id;
        }
      } catch (e) {
        console.error('Error querying for friend request ID:', e);
      }
    }

    if (!requestId) {
      toast({
        title: 'Request Unavailable',
        description: 'This friend request has already been resolved.',
      });
      // Clean up the stale notification from the inbox
      await clearNotificationHistory([notification.id]);
      return;
    }

    startResponding(async () => {
      const result = await respondToFriendRequest({
        requestId: requestId!,
        accept,
      });
      if (result.success) {
        setIsActionTaken(true);
        toast({
          title: 'Success',
          description: `Friend request ${accept ? 'accepted' : 'rejected'}.`,
        });
        markAsRead(); // Mark as read after action
      } else {
        // Check for specific error messages from the backend
        if (result.message.includes('not-found') || result.message.includes('already been responded to') || result.message.includes('resolved')) {
           toast({
              title: "Request Unavailable",
              description: "This friend request has already been resolved.",
            });
            // Clean up the stale notification from the inbox
            await clearNotificationHistory([notification.id]);
        } else {
          toast({
            title: 'Error',
            description: result.message,
            variant: 'destructive',
          });
        }
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
  
  const handleNavigate = (path: string) => {
    markAsRead();
    router.push(path);
  }

  const getNotificationDetails = () => {
    const name = fromUser?.name || fromUser?.email?.split('@')[0] || 'Someone';
    switch (notification.type) {
      case 'friend_request':
        return {
          icon: UserPlus,
          message: `${name} sent you a friend request.`,
        };
      case 'friend_accepted':
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
  const fallbackInitials =
    fromUser?.name?.slice(0, 2) || fromUser?.email?.slice(0, 2) || '?';

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
          <AvatarImage src={fromUser?.avatarUrl} data-ai-hint="person avatar" />
          <AvatarFallback>
            {fallbackInitials || <Icon className="h-5 w-5" />}
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
          {notification.type === 'friend_request' && !isActionTaken && (
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
          {notification.type === 'friend_request' && isActionTaken && (
            <div className="pt-1">
              <p className="text-xs text-muted-foreground italic">
                Response sent.
              </p>
            </div>
          )}
          {(notification.type === 'friend_accepted' || notification.type === 'new_message') && (
            <div className="flex gap-2 pt-1">
                <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 px-2"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleNavigate('/messages');
                    }}
                >
                    <MessageSquare className="h-4 w-4 mr-1" /> View Chat
                </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
