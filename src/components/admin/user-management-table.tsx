
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { UserProfile, UserRole } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { UserActions } from './user-actions';
import { useAuth } from '@/contexts/auth-context';
import { Twitch } from 'lucide-react';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface UserManagementTableProps {
  currentUserRole: 'admin' | 'moderator';
}

const getStatusBadge = (user: UserProfile) => {
    if (!user.disabled) {
        return <Badge variant="default">Active</Badge>;
    }
    if (user.banUntil) {
        const banEndDate = user.banUntil.toDate();
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>
                        <Badge variant="destructive">
                            Temp Banned
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Banned until {format(banEndDate, "PPP p")}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }
    return <Badge variant="destructive">Banned</Badge>;
};

const getRoleBadgeVariant = (role: UserRole): 'premium' | 'secondary' | 'moderator' => {
  if (role === 'admin') {
    return 'premium';
  }
  if (role === 'moderator') {
    return 'moderator';
  }
  return 'secondary';
};


export function UserManagementTable({ currentUserRole }: UserManagementTableProps) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;

    if (currentUser) {
      setLoading(true);
      const usersQuery = query(collection(db, 'users'));
      unsubscribe = onSnapshot(usersQuery, (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) } as UserProfile));
        setUsers(usersData);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching users:", error);
        setLoading(false);
      });
    } else {
      setUsers([]);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser]);

  const filteredUsers = useMemo(() => {
    if (!filter) return users;
    return users.filter(user =>
      user.name?.toLowerCase().includes(filter.toLowerCase()) ||
      user.email?.toLowerCase().includes(filter.toLowerCase()) ||
      user.country?.toLowerCase().includes(filter.toLowerCase())
    );
  }, [users, filter]);

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      const timeA = a.createdAt?.toMillis() || 0;
      const timeB = b.createdAt?.toMillis() || 0;
      return timeB - timeA; // Sort by most recent first
    });
  }, [filteredUsers]);

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Filter by name, email, or country..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="max-w-sm"
      />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Certified</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedUsers.length > 0 ? (
              sortedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person avatar" />
                        <AvatarFallback>{user.name?.slice(0, 2) || user.email?.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <Link href={`/users/${user.id}`} className="font-medium hover:underline">
                          {user.name}
                        </Link>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">{user.role}</Badge>
                  </TableCell>
                   <TableCell>
                    {user.isCertifiedStreamer && (
                      <div className="flex justify-center">
                        <Twitch className="h-5 w-5 text-purple-500" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{user.country || 'N/A'}</TableCell>
                  <TableCell>
                    {user.createdAt ? formatDistanceToNow(user.createdAt.toDate(), { addSuffix: true }) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(user)}
                  </TableCell>
                  <TableCell className="text-right">
                    {currentUser?.uid !== user.id && <UserActions user={user} currentUserRole={currentUserRole} />}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
