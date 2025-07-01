// src/components/friends/friendship-button.tsx
'use client';

import { useState, useEffect, useTransition } from 'react';
import { useAuth } from '@/contexts/auth-context';
import type { UserProfile } from '@/lib/types';
import {
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Button } from '../ui/button';
import {
  UserPlus,
  Clock,
  Users,
  UserX,
  Inbox,
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
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../ui/tooltip';

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
    let isMounted = true;

    const determineStatus = async () => {
        // Guard against missing user/profile
        if (!user || !userProfile) {
            if (isMounted) setStatus('loading');
            return;
        }

        // Don't show button for self
        if (user.uid === targetUser.id) {
            if (isMounted) setStatus('self');
            return;
        }
        
        // --- STEP 1: Check friendship status directly from the user profile ---
        // This is the primary source of truth.
        if (userProfile.friends?.includes(targetUser.id)) {
            if (isMounted) setStatus('friends');
            return;
        }

        // --- STEP 2: If not friends, check for a pending friend request ---
        try {
            // Query for a request sent FROM ME TO TARGET
            const sentQuery = query(
                collection(db, 'friendRequests'),
                where('from', '==', user.uid),
                where('to', '==', targetUser.id),
                where('status', '==', 'pending')
            );
            const sentSnapshot = await getDocs(sentQuery);
            
            if (!sentSnapshot.empty) {
                if (isMounted) {
                    setRequestId(sentSnapshot.docs[0].id);
                    setStatus('request_sent');
                }
                return; // Found a request, stop here.
            }
            
            // Query for a request sent FROM TARGET TO ME
            const receivedQuery = query(
                collection(db, 'friendRequests'),
                where('from', '==', targetUser.id),
                where('to', '==', user.uid),
                where('status', '==', 'pending')
            );
            const receivedSnapshot = await getDocs(receivedQuery);

            if (!receivedSnapshot.empty) {
                if (isMounted) {
                    setRequestId(receivedSnapshot.docs[0].id);
                    setStatus('request_received');
                }
                return; // Found a request, stop here.
            }

            // --- STEP 3: If no friendship and no requests, they are not friends ---
            if (isMounted) {
              setStatus('not_friends');
              setRequestId(null);
            }

        } catch (error) {
            console.error("Error checking friendship status:", error);
            if (isMounted) setStatus('not_friends'); // Default to safe state on error
        }
    };

    determineStatus();

    // Cleanup function
    return () => {
        isMounted = false;
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
        // Manually update status to give instant feedback
        setStatus('request_sent');
      } else {
        if (result.message.includes('already-exists') || result.message.includes('already sent')) {
             toast({
                title: 'Request Already Pending',
                description: 'A friend request between you and this user already exists.',
                variant: 'destructive',
                duration: 8000,
            });
            // Correct the state if the backend confirms a request exists
            setStatus('request_sent');
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
        // Optimistic update for instant UI feedback
        setStatus(accept ? 'friends' : 'not_friends');
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
        // If the request was not found, it means it was resolved. Update UI.
        if (result.message.includes('not-found')) {
            setStatus('not_friends');
        }
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
        // Optimistic update for instant UI feedback
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

  const renderButton = () => {
    switch (status) {
      case 'loading':
        return <Button size="icon" variant="outline" className="w-10 h-10" disabled><Clock className="h-4 w-4" /></Button>;
      case 'self':
        return null;
      case 'not_friends':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" onClick={handleSendRequest} disabled={isPending}>
                <UserPlus className="h-4 w-4" />
                <span className="sr-only">Add Friend</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add Friend</p>
            </TooltipContent>
          </Tooltip>
        );
      case 'request_sent':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="outline" disabled>
                <Clock className="h-4 w-4" />
                 <span className="sr-only">Request Sent</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Request Sent</p>
            </TooltipContent>
          </Tooltip>
        );
      case 'request_received':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="outline" disabled>
                <Inbox className="h-4 w-4" />
                 <span className="sr-only">Request Received</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Request Received</p>
            </TooltipContent>
          </Tooltip>
        );
      case 'friends':
        return (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="secondary">
                    <Users className="h-4 w-4" />
                     <span className="sr-only">Friends</span>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Friends</p>
              </TooltipContent>
            </Tooltip>
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

  return (
    <TooltipProvider>
      {renderButton()}
    </TooltipProvider>
  )
}