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

  // Effect 1: Real-time listener for friendship status from the 'friends' subcollection.
  useEffect(() => {
    if (!user) {
      setStatus('loading');
      setIsFriend(null);
      return;
    }
    if (user.uid === targetUser.id) {
      setStatus('self');
      return;
    }
    
    // A direct listener on the friends subcollection is the most reliable way 
    // to get real-time friend status for both users.
    const friendDocRef = doc(db, 'friends', user.uid, 'list', targetUser.id);
    const unsubscribeFriend = onSnapshot(friendDocRef, (doc) => {
        setIsFriend(doc.exists());
    });
    
    return () => unsubscribeFriend();
  }, [user, targetUser.id]);
  
  // Effect 2: Determines button state based on friendship status or pending requests.
  useEffect(() => {
    // Wait until we know the friendship status
    if (isFriend === null || !user) {
      setStatus('loading');
      return;
    }

    // If they are friends, the status is clear.
    if (isFriend) {
      setStatus('friends');
      return;
    }

    // If they are not friends, check for any pending friend requests.
    // This query is more robust as it doesn't require a custom composite index.
    const q = query(
      collection(db, 'friendRequests'),
      where('participantIds', 'array-contains', user.uid)
    );

    const unsubscribeRequests = onSnapshot(q, (snapshot) => {
      // It's possible to become friends while this listener is active, so we re-check.
      if (isFriend) {
          setStatus('friends');
          return;
      }

      // Filter on the client-side to find the specific pending request.
      const relevantRequestDoc = snapshot.docs.find(doc => {
          const request = doc.data();
          return request.participantIds.includes(targetUser.id) && request.status === 'pending';
      });

      if (relevantRequestDoc) {
          const request = relevantRequestDoc.data() as FriendRequest;
          setRequestId(relevantRequestDoc.id);
          setStatus(
            request.from === user.uid ? 'request_sent' : 'request_received'
          );
      } else {
        // No pending request found between these two users
        setStatus('not_friends');
        setRequestId(null);
      }
    }, (error) => {
        console.error("Error listening to friend requests:", error);
        setStatus('not_friends'); // Fallback to a safe state
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
