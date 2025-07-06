
// src/components/inbox/notification-item.tsx
'use client';

import type { Notification, UserProfile } from '@/lib/types';
import { useTransition, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { respondToFriendRequest } from '@/lib/actions/friends';
import {
  doc,
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
  Users,
  Check,
  X,
  MessageSquare,
  Bell,
  LogIn,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Skeleton } from '../ui/skeleton';
import { useRouter } from 'next/navigation';
import { deleteNotifications } from '@/lib/actions/notifications';
import { respondToTeamInvite } from '@/lib/actions/teams';

export function NotificationItem({
  notification,
}: {
  notification: Notification;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isResponding, startResponding] = useTransition();
  const [isDismissing, startDismissing] = useTransition();
  const [isActionTaken, setIsActionTaken] = useState(false);
  const [fromUser, setFromUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchFromUser = async () => {
      setLoading(true); // Reset loading state for each notification
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
          }
        }
      } catch (error) {
        console.error('Error fetching user for notification:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFromUser();
    
    return () => { isMounted = false; };
  }, [notification.id, notification.from]);

  const findRequestId = async (): Promise<string | null> => {
    if (notification.extraData?.requestId) {
        return notification.extraData.requestId;
    }
    // Fallback query if requestId is missing from notification payload
    if (notification.type === 'friend_request' && user) {
        try {
            const q = query(
                collection(db, "friendRequests"),
                where("from", "==", notification.from),
                where("to", "==", user.uid),
                where("status", "==", "pending")
            );
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) return querySnapshot.docs[0].id;
        } catch (error) {
            console.error('Error querying for friend request ID:', error);
        }
    }
    return null;
  }
  
  const findInviteId = async (): Promise<string | null> => {
    if (notification.extraData?.inviteId) {
        return notification.extraData.inviteId;
    }
    // Fallback query if inviteId is missing
    if (notification.type === 'team_invite_received' && user) {
        try {
            const q = query(
                collection(db, "teamInvitations"),
                where("fromTeamId", "==", notification.extraData.teamId),
                where("toUserId", "==", user.uid),
                where("status", "==", "pending")
            );
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) return querySnapshot.docs[0].id;
        } catch (error) {
            console.error('Error querying for team invite ID:', error);
        }
    }
    return null;
  }

  const handleFriendRequestResponse = (accept: boolean) => {
    startResponding(async () => {
        const requestId = await findRequestId();
        if (!requestId) {
            toast({ title: 'Request Unavailable', description: 'This friend request may have been resolved already.' });
            await deleteNotifications([notification.id]); // Clean up stale notification
            return;
        }
        const result = await respondToFriendRequest({ requestId, accept });
        if (result.success) {
            setIsActionTaken(true);
            toast({ title: 'Success', description: `Friend request ${accept ? 'accepted' : 'rejected'}.` });
            await deleteNotifications([notification.id]);
        } else {
            toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
    });
  };

  const handleTeamInviteResponse = (accept: boolean) => {
    startResponding(async () => {
        const inviteId = await findInviteId();
        if (!inviteId) {
            toast({ title: 'Invite Unavailable', description: 'This team invitation may have been withdrawn or already handled.' });
            await deleteNotifications([notification.id]);
            return;
        }
        const result = await respondToTeamInvite(inviteId, accept);
        if (result.success) {
            setIsActionTaken(true);
            toast({ title: 'Success', description: `Team invite ${accept ? 'accepted' : 'rejected'}.` });
            await deleteNotifications([notification.id]);
        } else {
            toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
    });
  };
  
  const handleDismissAndNavigate = (path: string) => {
    startDismissing(async () => {
        await deleteNotifications([notification.id]);
        router.push(path);
    });
  };

  const handleDismiss = () => {
    startDismissing(async () => {
        await deleteNotifications([notification.id]);
    });
  };

  const getNotificationDetails = () => {
    const fromName = fromUser?.name || 'Someone';
    const teamName = notification.extraData?.teamName || 'A team';
    const applicantName = notification.extraData?.applicantName || 'A player';

    switch (notification.type) {
      case 'friend_request': return { icon: UserPlus, message: `${fromName} sent you a friend request.` };
      case 'friend_accepted': return { icon: UserCheck, message: `You are now friends with ${fromName}.` };
      case 'team_invite_received': return { icon: Users, message: `${teamName} has invited you to join them.` };
      case 'team_invite_accepted': return { icon: UserCheck, message: `${fromName} has joined your team.` };
      case 'team_application_received': return { icon: LogIn, message: `${applicantName} has applied to join your team.` };
      case 'team_application_accepted': return { icon: UserCheck, message: `Congratulations! You've been accepted to ${teamName}.` };
      case 'team_application_rejected': return { icon: X, message: `Your application to ${teamName} was declined.` };
      default: return { icon: Bell, message: 'You have a new notification.' };
    }
  };

  if (loading) {
    return <Skeleton className="h-[76px] w-full p-3 rounded-lg" />;
  }

  const { icon: Icon, message } = getNotificationDetails();
  const fallbackInitials = fromUser?.name?.slice(0, 2) || '?';

  return (
    <div className={cn( 'flex items-start gap-3 p-3 transition-colors hover:bg-accent rounded-lg', !notification.read && 'bg-primary/5 hover:bg-primary/10' )}>
      <div className="flex-shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={fromUser?.avatarUrl || notification.extraData?.applicantAvatarUrl} data-ai-hint="person avatar" />
          <AvatarFallback>{fromUser ? fallbackInitials : <Icon className="h-5 w-5" />}</AvatarFallback>
        </Avatar>
      </div>
      <div className="flex-1 space-y-1">
        <p className="text-sm leading-tight">{message}</p>
        <p className="text-xs text-muted-foreground">
          {notification.timestamp ? formatDistanceToNow(notification.timestamp.toDate(), { addSuffix: true }) : ''}
        </p>

        {/* Action buttons */}
        {notification.type === 'friend_request' && !isActionTaken && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="h-7 px-2" onClick={() => handleFriendRequestResponse(true)} disabled={isResponding}>
              <Check className="h-4 w-4 mr-1" /> Accept
            </Button>
            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => handleFriendRequestResponse(false)} disabled={isResponding}>
              <X className="h-4 w-4 mr-1" /> Decline
            </Button>
          </div>
        )}
        {notification.type === 'friend_accepted' && (
          <div className="flex gap-2 pt-1">
              <Button size="sm" variant="secondary" className="h-7 px-2" onClick={() => handleDismissAndNavigate('/messages')} disabled={isDismissing}>
                  <MessageSquare className="h-4 w-4 mr-1" />
                  {isDismissing ? "Loading..." : "View Chat"}
              </Button>
               <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground" onClick={handleDismiss} disabled={isDismissing}>
                 {isDismissing ? "..." : "Dismiss"}
              </Button>
          </div>
        )}
         {notification.type === 'team_invite_received' && !isActionTaken && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="h-7 px-2" onClick={() => handleTeamInviteResponse(true)} disabled={isResponding}>
              <Check className="h-4 w-4 mr-1" /> Accept
            </Button>
            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => handleTeamInviteResponse(false)} disabled={isResponding}>
              <X className="h-4 w-4 mr-1" /> Decline
            </Button>
          </div>
        )}
        {notification.type === 'team_invite_accepted' && (
           <div className="flex gap-2 pt-1">
              <Button size="sm" variant="secondary" className="h-7 px-2" onClick={() => handleDismissAndNavigate(`/teams`)} disabled={isDismissing}>
                  <Users className="h-4 w-4 mr-1" />
                  {isDismissing ? "Loading..." : "View Team"}
              </Button>
          </div>
        )}
        {notification.type === 'team_application_received' && (
            <div className="flex gap-2 pt-1">
                <Button size="sm" variant="secondary" className="h-7 px-2" onClick={() => handleDismissAndNavigate(`/teams`)} disabled={isDismissing}>
                    <Users className="h-4 w-4 mr-1" />
                    {isDismissing ? "Loading..." : "View Applications"}
                </Button>
            </div>
        )}
        {(notification.type === 'team_application_accepted' || notification.type === 'team_application_rejected') && (
            <div className="flex gap-2 pt-1">
                <Button size="sm" variant="secondary" className="h-7 px-2" onClick={() => handleDismissAndNavigate(`/teams/${notification.extraData.teamId}`)} disabled={isDismissing}>
                    <Users className="h-4 w-4 mr-1" />
                    {isDismissing ? "Loading..." : "View Team"}
                </Button>
            </div>
        )}
      </div>
    </div>
  );
}
