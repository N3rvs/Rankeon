
// src/components/friends/friends-sheet.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Users, User, ShieldBan } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useI18n } from '@/contexts/i18n-context';
import { useToast } from '@/hooks/use-toast';
import { getFriends } from '@/lib/actions/friends';
import type { UserProfile, UserStatus } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Spinner } from '../ui/spinner';
import { ChatDialog } from './chat-dialog';
import { BlockedUsersList } from '../profile/blocked-users-list';
import { Separator } from '../ui/separator';

interface EnrichedFriend extends UserProfile {}

function FriendList() {
  const { user, userProfile } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user) {
      setFriends([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    getFriends()
      .then((result) => {
        if (result.success && result.data) {
          setFriends(result.data);
        } else {
          toast({
            title: 'Error',
            description: result.message,
            variant: 'destructive',
          });
          setFriends([]);
        }
      })
      .finally(() => setLoading(false));
  }, [user, toast]);
  
  const { onlineFriends, offlineFriends } = useMemo(() => {
    const online = friends.filter(
      (f) => f.status && ['available', 'busy', 'away'].includes(f.status)
    );
    const offline = friends.filter(
      (f) => !f.status || f.status === 'offline'
    );
    return { onlineFriends: online, offlineFriends: offline };
  }, [friends]);

  const FriendItem = ({ friend }: { friend: EnrichedFriend }) => {
    const statusConfig: { [key in UserStatus | 'default']: string } = {
        available: 'bg-green-500',
        busy: 'bg-red-500',
        away: 'bg-yellow-400',
        offline: 'bg-gray-400',
        default: 'bg-gray-400',
    };
    const statusColor = statusConfig[friend.status || 'offline'] || statusConfig.default;

    return (
       <button
        onClick={() => setSelectedFriend(friend)}
        className="w-full flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-muted text-left"
        >
        <div className="relative flex-shrink-0">
          <Avatar className="h-10 w-10">
            <AvatarImage src={friend.avatarUrl} data-ai-hint="person avatar" />
            <AvatarFallback>{friend.name.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <span
            className={cn(
              'absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-card',
              statusColor
            )}
          />
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="font-semibold text-sm truncate">{friend.name}</p>
          <p className="text-xs text-muted-foreground capitalize">
            {friend.status || 'Offline'}
          </p>
        </div>
      </button>
    );
  };

  return (
    <>
      <ChatDialog
        recipient={selectedFriend}
        open={!!selectedFriend}
        onOpenChange={(isOpen) => !isOpen && setSelectedFriend(null)}
      />
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-1">
          {loading ? (
            <div className="flex justify-center p-8">
              <Spinner />
            </div>
          ) : friends.length > 0 ? (
            <>
              {onlineFriends.length > 0 && (
                <div>
                  <h3 className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Online — {onlineFriends.length}
                  </h3>
                  {onlineFriends.map((friend) => (
                    <FriendItem key={friend.id} friend={friend} />
                  ))}
                </div>
              )}
              {offlineFriends.length > 0 && (
                <div className="pt-2">
                  <h3 className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Offline — {offlineFriends.length}
                  </h3>
                  {offlineFriends.map((friend) => (
                    <FriendItem key={friend.id} friend={friend} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="p-4 text-sm text-center text-muted-foreground">
              {t('MessagesPage.no_conversations')}
            </p>
          )}
        </nav>
        {userProfile && userProfile.blocked && userProfile.blocked.length > 0 && (
            <div className="p-2 mt-2">
                <Separator />
                <h3 className="px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <ShieldBan className="h-4 w-4" />
                    Blocked Users
                </h3>
                <div className="space-y-2">
                    <BlockedUsersList blockedIds={userProfile.blocked} />
                </div>
            </div>
        )}
      </ScrollArea>
    </>
  );
}


export function FriendsSheet() {
  const { t } = useI18n();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Users className="h-5 w-5" />
          <span className="sr-only">Open Friends</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col p-0 w-80">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2 font-headline">
            <User className="h-5 w-5" />
            {t('Sidebar.friends')}
          </SheetTitle>
        </SheetHeader>
        <FriendList />
      </SheetContent>
    </Sheet>
  );
}
