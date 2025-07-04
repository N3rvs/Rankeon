
'use client';

import { useState, useEffect, useTransition } from 'react';
import { db } from '@/lib/firebase/client';
import { doc, getDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { UserCheck } from 'lucide-react';
import { unblockUser } from '@/lib/actions/friends';
import { useToast } from '@/hooks/use-toast';

interface BlockedUsersListProps {
  blockedIds: string[];
}

export function BlockedUsersList({ blockedIds }: BlockedUsersListProps) {
  const [blockedUsers, setBlockedUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlockedUsers = async () => {
      if (!blockedIds || blockedIds.length === 0) {
        setBlockedUsers([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const userPromises = blockedIds.map(id => getDoc(doc(db, 'users', id)));
        const userDocs = await Promise.all(userPromises);
        const users = userDocs
          .filter(docSnap => docSnap.exists())
          .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as UserProfile));
        setBlockedUsers(users);
      } catch (error) {
        console.error("Error fetching blocked users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlockedUsers();
  }, [blockedIds]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-9 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (blockedUsers.length === 0) {
    return <p className="text-sm text-muted-foreground">You haven't blocked any users.</p>;
  }

  return (
    <div className="space-y-4">
      {blockedUsers.map(user => (
        <BlockedUserItem key={user.id} user={user} />
      ))}
    </div>
  );
}

function BlockedUserItem({ user }: { user: UserProfile }) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleUnblock = () => {
    startTransition(async () => {
      const result = await unblockUser(user.id);
      if (result.success) {
        toast({ title: 'User Unblocked', description: `You have unblocked ${user.name}.` });
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Avatar>
          <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person avatar" />
          <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <span className="font-medium">{user.name}</span>
      </div>
      <Button variant="outline" size="sm" onClick={handleUnblock} disabled={isPending}>
        <UserCheck className="mr-2 h-4 w-4" />
        {isPending ? 'Unblocking...' : 'Unblock'}
      </Button>
    </div>
  );
}
