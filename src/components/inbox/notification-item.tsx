// src/components/inbox/notification-item.tsx
'use client';

import type { Notification } from '@/lib/types';
import { useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { respondToFriendRequest } from '@/lib/actions/friends';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { cn } from '@/lib/utils';
import {
  UserPlus,
  UserCheck,
  UserX,
  Users,
  Check,
  X,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';

export function NotificationItem({ notification }: { notification: Notification }) {
  const { toast } = useToast();
  const [isResponding, startResponding] = useTransition();

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
    try {
        const notifRef = doc(db, 'notifications', notification.id);
        await updateDoc(notifRef, { read: true });
    } catch (error) {
        console.error("Failed to mark notification as read:", error);
    }
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
            src={notification.fromUser?.avatarUrl}
            data-ai-hint="person avatar"
          />
          <AvatarFallback>
            {notification.fromUser?.name.slice(0, 2) || <Icon className="h-5 w-5"/>}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <p className="text-sm leading-tight">{notification.message}</p>
          <p className="text-xs text-muted-foreground">
            {notification.createdAt ? formatDistanceToNow(notification.createdAt.toDate(), {
              addSuffix: true,
            }) : ''}
          </p>
            {notification.type === 'friend_request_received' && (
            <div className="flex gap-2 pt-1">
                <Button
                size="sm"
                className="h-7 px-2"
                onClick={(e) => { e.stopPropagation(); handleResponse(true); }}
                disabled={isResponding}
                >
                <Check className="h-4 w-4 mr-1" /> Accept
                </Button>
                <Button
                size="sm"
                variant="outline"
                className="h-7 px-2"
                onClick={(e) => { e.stopPropagation(); handleResponse(false); }}
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
