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
  doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Button } from '../ui/button';
import {
  UserPlus,
  Clock,
  Check,
  X,
  Users,
  UserX,
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
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<FriendshipStatus>('loading');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [isFriend, setIsFriend] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!user) {
      setStatus('loading');
      return;
    }
    if (user.uid === targetUser.id) {
      setStatus('self');
      return;
    }
    
    // Use a direct listener on the subcollection for real-time friend status
    const friendDocRef = doc(db, 'friends', user.uid, 'list', targetUser.id);
    const unsubscribeFriend = onSnapshot(friendDocRef, (doc) => {
        setIsFriend(doc.exists());
    });
    
    return () => unsubscribeFriend();
  }, [user, targetUser.id]);
  
  
  useEffect(() => {
    if (isFriend === null || !user) {
      setStatus('loading');
      return;
    }

    if (isFriend) {
      setStatus('friends');
      return;
    }

    // If they are not friends, check for any pending friend requests.
    const q = query(
      collection(db, 'friendRequests'),
      where('participantIds', 'array-contains', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribeRequests = onSnapshot(q, (snapshot) => {
      // Re-check friendship status in case it changed while setting up listener
      if (isFriend) {
          setStatus('friends');
          return;
      }

      let foundRequest = false;
      for (const doc of snapshot.docs) {
        const request = doc.data() as FriendRequest;
        // Check if the request involves the target user
        if (request.participantIds.includes(targetUser.id)) {
          foundRequest = true;
          setRequestId(doc.id);
          setStatus(
            request.from === user.uid ? 'request_sent' : 'request_received'
          );
          break; // Found the relevant request, no need to check others
        }
      }

      if (!foundRequest) {
        setStatus('not_friends');
        setRequestId(null);
      }
    });

    return () => unsubscribeRequests();
  }, [user, targetUser.id, isFriend]);


  const handleSendRequest = () => {
    startTransition(async () => {
      const result = await sendFriendRequest(targetUser.id);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Friend request sent.',
        });
      } else {
        if (result.message.includes('already sent')) {
             toast({
                title: 'Request Already Exists',
                description: 'An old friend request may exist. This can happen if a friend was removed but the original request was not cleaned up in the database.',
                variant: 'destructive',
                duration: 8000,
            });
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

  const handleResponse = (accept: boolean) => {
    if (!requestId) return;
    startTransition(async () => {
      const result = await respondToFriendRequest({ requestId, accept });
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

  const handleRemoveFriend = () => {
    startTransition(async () => {
      const result = await removeFriend(targetUser.id);
      if (result.success) {
        toast({
          title: 'Friend Removed',
          description: `You are no longer friends with ${targetUser.name}.`,
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
          <Button className="flex-1" onClick={() => handleResponse(true)} disabled={isPending}><Check className="mr-2 h-4 w-4" /> Accept</Button>
          <Button className="flex-1" variant="destructive" onClick={() => handleResponse(false)} disabled={isPending}><X className="mr-2 h-4 w-4" /> Decline</Button>
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
