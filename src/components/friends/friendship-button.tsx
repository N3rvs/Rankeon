
// src/components/friends/friendship-button.tsx
'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
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
  Check,
  X as XIcon,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface FriendshipButtonProps {
  targetUser: UserProfile;
  variant?: 'default' | 'icon';
}

type FriendshipStatus =
  | 'loading'
  | 'not_friends'
  | 'request_sent'
  | 'request_received'
  | 'friends'
  | 'self';

export function FriendshipButton({ targetUser, variant = 'default' }: FriendshipButtonProps) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<FriendshipStatus>('loading');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isSendingRequest = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const determineStatus = async () => {
        if (!user || !userProfile) {
            if (isMounted) setStatus('loading');
            return;
        }

        if (user.uid === targetUser.id) {
            if (isMounted) setStatus('self');
            return;
        }
        
        if (userProfile.friends?.includes(targetUser.id)) {
            if (isMounted) setStatus('friends');
            return;
        }

        try {
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
                return;
            }
            
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
                return;
            }

            if (isMounted) {
              setStatus('not_friends');
              setRequestId(null);
            }

        } catch (error) {
            console.error("Error checking friendship status:", error);
            if (isMounted) setStatus('not_friends');
        }
    };

    determineStatus();

    return () => {
        isMounted = false;
    };
  }, [user, userProfile, targetUser.id]);


  const handleSendRequest = () => {
    if (isSendingRequest.current) return;
    isSendingRequest.current = true;

    startTransition(async () => {
      try {
        const result = await sendFriendRequest(targetUser.id);
        if (result.success) {
          toast({
            title: 'Success',
            description: 'Friend request sent.',
          });
          setStatus('request_sent');
        } else {
          if (result.message.includes('already-exists') || result.message.includes('already sent')) {
              toast({
                  title: 'Request Already Pending',
                  description: 'A friend request between you and this user already exists.',
                  variant: 'destructive',
                  duration: 8000,
              });
              setStatus('request_sent');
          } else {
              toast({
                  title: 'Error',
                  description: result.message,
                  variant: 'destructive',
              });
          }
        }
      } finally {
        isSendingRequest.current = false;
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
        setStatus(accept ? 'friends' : 'not_friends');
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
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
    if (variant === 'icon') {
      switch (status) {
        case 'loading':
          return (
            <Button variant="ghost" size="icon" disabled>
              <Clock className="h-4 w-4 animate-spin" />
            </Button>
          );
        case 'not_friends':
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSendRequest}
                    disabled={isPending}
                  >
                    <UserPlus className="h-4 w-4" />
                    <span className="sr-only">Añadir Amigo</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Añadir Amigo</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        case 'request_sent':
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" disabled>
                    <Clock className="h-4 w-4" />
                    <span className="sr-only">Solicitud Enviada</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Solicitud Enviada</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        case 'request_received':
          return (
             <DropdownMenu>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="relative">
                        <UserPlus className="h-4 w-4 text-primary" />
                        <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-primary ring-1 ring-background" />
                        <span className="sr-only">Responder a solicitud</span>
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Responder a solicitud</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => handleResponse(true)} disabled={isPending}>
                  <Check className="mr-2 h-4 w-4" /> Aceptar
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => handleResponse(false)}
                  disabled={isPending}
                >
                  <XIcon className="mr-2 h-4 w-4" /> Rechazar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        case 'friends':
          return (
            <DropdownMenu>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="sr-only">Amigos</span>
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Amigos</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={handleRemoveFriend}
                  disabled={isPending}
                >
                  <UserX className="mr-2 h-4 w-4" /> Eliminar Amigo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        case 'self':
          return <div className="h-10 w-10" />;
        default:
          return null;
      }
    }
    
    switch (status) {
      case 'loading':
        return <Button className="w-full" disabled><Clock className="mr-2 h-4 w-4" /> Loading...</Button>;
      case 'self':
        return null;
      case 'not_friends':
        return (
          <Button onClick={handleSendRequest} disabled={isPending} className="w-full">
            <UserPlus className="mr-2 h-4 w-4" />
            Añadir Amigo
          </Button>
        );
      case 'request_sent':
        return (
          <Button variant="outline" disabled className="w-full">
            <Clock className="mr-2 h-4 w-4" />
            Solicitud Enviada
          </Button>
        );
      case 'request_received':
        return (
            <div className="flex gap-2 w-full">
                <Button onClick={() => handleResponse(true)} disabled={isPending} className="w-full">
                    <Check className="mr-2 h-4 w-4" />
                    Aceptar
                </Button>
                 <Button onClick={() => handleResponse(false)} disabled={isPending} className="w-full" variant="secondary">
                    <XIcon className="mr-2 h-4 w-4" />
                    Rechazar
                </Button>
            </div>
        );
      case 'friends':
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" className="w-full">
                <Users className="mr-2 h-4 w-4" />
                Amigos
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={handleRemoveFriend} disabled={isPending}>
                <UserX className="mr-2 h-4 w-4" /> Eliminar Amigo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      default:
        return null;
    }
  }

  return renderButton();
}
