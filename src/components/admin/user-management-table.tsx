
'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { Twitch, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { getManagedUsers } from '@/lib/actions/users';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '../ui/spinner';
import { Button } from '../ui/button';

interface UserManagementTableProps {
  currentUserRole: 'admin' | 'moderator';
}

const PAGE_SIZE = 5;

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

const getRoleBadgeVariant = (role: UserRole): 'premium' | 'secondary' | 'moderator' | 'player' | 'founder' | 'coach' => {
  const roleVariantMap: { [key in UserRole]?: 'premium' | 'player' | 'moderator' | 'founder' | 'coach' } = {
    admin: 'premium',
    moderator: 'moderator',
    player: 'player',
    founder: 'founder',
    coach: 'coach',
  };
  return roleVariantMap[role] || 'secondary';
};


export function UserManagementTable({ currentUserRole }: UserManagementTableProps) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    if (!currentUser) {
        setLoading(false);
        return;
    }
    setLoading(true);
    getManagedUsers().then(result => {
        if (result.success && result.data) {
            setUsers(result.data);
        } else {
            toast({
                title: 'Error fetching users',
                description: result.message,
                variant: 'destructive',
            });
        }
        setLoading(false);
    }).catch(error => {
        toast({
            title: 'Error',
            description: 'Failed to load user data.',
            variant: 'destructive',
        });
        setLoading(false);
    })
  }, [currentUser, toast]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

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

  const totalPages = Math.ceil(sortedUsers.length / PAGE_SIZE) || 1;
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return sortedUsers.slice(startIndex, startIndex + PAGE_SIZE);
  }, [sortedUsers, currentPage]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Input
          placeholder="Filter by name, email, or country..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
          disabled
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
              <TableRow>
                <TableCell colSpan={7} className="h-48">
                  <Spinner />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
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
            {paginatedUsers.length > 0 ? (
              paginatedUsers.map((user) => (
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
       {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 py-4">
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Go to previous page"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Go to next page"
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

    