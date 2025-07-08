// src/components/friends/friendship-button.tsx
'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import type { UserProfile } from '@/lib/types';
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
  getFriendshipStatus,
  type FriendshipStatus,
} from '@/lib/actions/friends';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useI18n } from '@/contexts/i18n-context';

interface FriendshipButtonProps {
  targetUser: UserProfile;
  variant?: 'default' | 'icon';
}

export function FriendshipButton({ targetUser, variant = 'default' }: FriendshipButtonProps) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [status, setStatus] = useState<FriendshipStatus>('loading');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isSendingRequest = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const checkStatus = async () => {
      if (!user) {
        if (isMounted) setStatus('loading');
        return;
      }
      if (user.uid === targetUser.id) {
        if (isMounted) setStatus('self');
        return;
      }
      
      const result = await getFriendshipStatus(targetUser.id);
      if (isMounted) {
        if (result.success && result.data?.status) {
          setStatus(result.data.status);
          setRequestId(result.data.requestId || null);
        } else {
          setStatus('not_friends');
        }
      }
    };

    checkStatus();

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
          const newStatus = await getFriendshipStatus(targetUser.id);
          if(newStatus.success && newStatus.data){
            setStatus(newStatus.data.status);
            setRequestId(newStatus.data.requestId || null);
          }
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
    if (!requestId) {
        toast({ title: "Request Unavailable", description: 'This friend request may have been resolved already.' });
        setStatus('not_friends');
        return;
    };
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
                    <span className="sr-only">{t('FriendshipButton.add_friend')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('FriendshipButton.add_friend')}</p>
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
                    <span className="sr-only">{t('FriendshipButton.request_sent')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('FriendshipButton.request_sent')}</p>
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
                        <span className="sr-only">{t('FriendshipButton.respond_request')}</span>
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('FriendshipButton.respond_request')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => handleResponse(true)} disabled={isPending}>
                  <Check className="mr-2 h-4 w-4" /> {t('FriendshipButton.accept')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => handleResponse(false)}
                  disabled={isPending}
                >
                  <XIcon className="mr-2 h-4 w-4" /> {t('FriendshipButton.decline')}
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
                        <span className="sr-only">{t('FriendshipButton.friends')}</span>
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('FriendshipButton.friends')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={handleRemoveFriend}
                  disabled={isPending}
                >
                  <UserX className="mr-2 h-4 w-4" /> {t('FriendshipButton.remove_friend')}
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
        return <Button className="w-full" disabled><Clock className="mr-2 h-4 w-4" /> {t('FriendshipButton.loading')}</Button>;
      case 'self':
        return null;
      case 'not_friends':
        return (
          <Button onClick={handleSendRequest} disabled={isPending} className="w-full">
            <UserPlus className="mr-2 h-4 w-4" />
            {t('FriendshipButton.add_friend')}
          </Button>
        );
      case 'request_sent':
        return (
          <Button variant="outline" disabled className="w-full">
            <Clock className="mr-2 h-4 w-4" />
            {t('FriendshipButton.request_sent')}
          </Button>
        );
      case 'request_received':
        return (
            <div className="flex gap-2 w-full">
                <Button onClick={() => handleResponse(true)} disabled={isPending} className="w-full">
                    <Check className="mr-2 h-4 w-4" />
                    {t('FriendshipButton.accept')}
                </Button>
                 <Button onClick={() => handleResponse(false)} disabled={isPending} className="w-full" variant="secondary">
                    <XIcon className="mr-2 h-4 w-4" />
                    {t('FriendshipButton.decline')}
                </Button>
            </div>
        );
      case 'friends':
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" className="w-full">
                <Users className="mr-2 h-4 w-4" />
                {t('FriendshipButton.friends')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={handleRemoveFriend} disabled={isPending}>
                <UserX className="mr-2 h-4 w-4" /> {t('FriendshipButton.remove_friend')}
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
