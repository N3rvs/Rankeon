// src/components/friends/friendship-button.tsx
'use client';

import { useState, useEffect, useTransition } from 'react';
import { useAuth } from '@/contexts/auth-context';
import type { UserProfile, FriendRequest } from '@/lib/types';
import {
  collection,
  query,
  where,
  onSnapshot,
  Unsubscribe,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Button } from '../ui/button';
import {
  UserPlus,
  UserCheck,
  Clock,
  Check,
  X,
  Users,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  sendFriendRequest,
  respondToFriendRequest,
  removeFriend,
} from '@/lib/actions/friends';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FriendshipButtonProps {
  targetUser: UserProfile;
}

type FriendshipStatus =
  | 'loading'
  | 'not_friends'
  | 'request_sent'
  | 'request_received'
  | 'friends'
  | 'self';

export function FriendshipButton({ targetUser }: FriendshipButtonProps) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<FriendshipStatus>('loading');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!user || !userProfile) {
      setStatus('loading');
      return;
    }
    if (user.uid === targetUser.id) {
      setStatus('self');
      return;
    }
    if (userProfile.friends?.includes(targetUser.id)) {
      setStatus('friends');
      return;
    }

    // Listen for friend requests between the two users
    const q = query(
      collection(db, 'friend_requests'),
      where('participantIds', 'array-contains', user.uid),
      limit(20) // Limit query for performance
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let foundRequest = false;
      for (const doc of snapshot.docs) {
        const request = doc.data() as FriendRequest;
        if (
          (request.fromId === user.uid && request.toId === targetUser.id) ||
          (request.fromId === targetUser.id && request.toId === user.uid)
        ) {
          if (request.status === 'pending') {
            foundRequest = true;
            setRequestId(doc.id);
            setStatus(
              request.fromId === user.uid ? 'request_sent' : 'request_received'
            );
          }
          break;
        }
      }
      if (!foundRequest && !userProfile.friends?.includes(targetUser.id)) {
        setStatus('not_friends');
        setRequestId(null);
      }
    });

    // Also need to listen to changes on the userProfile.friends array
    const userDocUnsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
        const updatedProfile = doc.data() as UserProfile;
        if (updatedProfile.friends?.includes(targetUser.id)) {
            setStatus('friends');
        }
    });


    return () => {
        unsubscribe();
        userDocUnsubscribe();
    };
  }, [user, userProfile, targetUser.id]);

  const handleSendRequest = () => {
    startTransition(async () => {
      const result = await sendFriendRequest(targetUser.id);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Friend request sent.',
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

  const handleResponse = (response: 'accepted' | 'rejected') => {
    if (!requestId) return;
    startTransition(async () => {
      const result = await respondToFriendRequest({ requestId, response });
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

  const handleRemoveFriend = () => {
    startTransition(async () => {
      const result = await removeFriend(targetUser.id);
      if (result.success) {
        toast({
          title: 'Friend Removed',
          description: `You are no longer friends with ${targetUser.name}.`,
        });
        setStatus('not_friends');
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    });
  };

  switch (status) {
    case 'loading':
      return <Button className="w-full" disabled><Clock className="mr-2 h-4 w-4" /> Loading...</Button>;
    case 'self':
      return null;
    case 'not_friends':
      return <Button className="w-full" onClick={handleSendRequest} disabled={isPending}><UserPlus className="mr-2 h-4 w-4" /> Add Friend</Button>;
    case 'request_sent':
      return <Button className="w-full" variant="outline" disabled><Clock className="mr-2 h-4 w-4" /> Request Sent</Button>;
    case 'request_received':
      return (
        <div className="flex w-full gap-2">
          <Button className="flex-1" onClick={() => handleResponse('accepted')} disabled={isPending}><Check className="mr-2 h-4 w-4" /> Accept</Button>
          <Button className="flex-1" variant="destructive" onClick={() => handleResponse('rejected')} disabled={isPending}><X className="mr-2 h-4 w-4" /> Decline</Button>
        </div>
      );
    case 'friends':
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="w-full" variant="secondary"><Users className="mr-2 h-4 w-4" /> Friends</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={handleRemoveFriend}>
              <UserX className="mr-2 h-4 w-4" /> Remove Friend
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    default:
      return null;
  }
}
