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

    // Step 1: Check friendship status from the user's profile friends array.
    // This is now the primary source of truth, updated in real-time via AuthContext.
    const areFriends = userProfile.friends?.includes(targetUser.id) ?? false;
    if (areFriends) {
      setStatus('friends');
      return;
    }

    // Step 2: If not friends, check for a pending friend request.
    // This relies on your backend function adding a `participantIds` array to the friend request document.
    const q = query(
      collection(db, 'friendRequests'),
      where('status', '==', 'pending'),
      where('participantIds', 'array-contains', user.uid)
    );

    const unsubscribeRequests = onSnapshot(q, (snapshot) => {
      // Re-check friendship in case the status changed while the listener was being set up.
      if (userProfile.friends?.includes(targetUser.id)) {
        setStatus('friends');
        return;
      }

      // Filter on the client to find the specific request involving the target user.
      const relevantRequestDoc = snapshot.docs.find(doc => {
        const request = doc.data();
        return request.participantIds.includes(targetUser.id);
      });

      if (relevantRequestDoc) {
        const request = relevantRequestDoc.data() as FriendRequest;
        setRequestId(relevantRequestDoc.id);
        setStatus(
          request.from === user.uid ? 'request_sent' : 'request_received'
        );
      } else {
        // No pending request found between these two users.
        setStatus('not_friends');
        setRequestId(null);
      }
    }, (error) => {
        console.error("Error listening to friend requests:", error);
        setStatus('not_friends'); // Fallback to a safe state
    });

    return () => unsubscribeRequests();
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
        // Your backend now handles the "already sent" case, but this is a good fallback.
        if (result.message.includes('already-exists') || result.message.includes('already sent')) {
             toast({
                title: 'Request Already Pending',
                description: 'A friend request between you and this user already exists.',
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
      // This calls your new, improved backend function.
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
