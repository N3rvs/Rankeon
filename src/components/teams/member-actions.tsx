'use client';

import { useState, useTransition } from 'react';
import { MoreHorizontal, Shield, User, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { kickUserFromTeam, changeUserRole } from '@/lib/actions/teams';
import type { TeamMember, UserProfile } from '@/lib/types';

interface MemberActionsProps {
  member: UserProfile & { role: TeamMember['role'] };
  currentMemberRole: TeamMember['role'];
  teamId: string;
}

export function MemberActions({ member, currentMemberRole, teamId }: MemberActionsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isKickAlertOpen, setIsKickAlertOpen] = useState(false);

  if (member.id === user?.uid) return null;

  const canManage = currentMemberRole === 'founder' || currentMemberRole === 'coach';
  const isFounder = currentMemberRole === 'founder';
  const targetIsFounder = member.role === 'founder';

  if (!canManage || targetIsFounder || (currentMemberRole === 'coach' && member.role === 'coach')) {
    return null;
  }

  const handleKick = () => {
    startTransition(async () => {
      const result = await kickUserFromTeam(teamId, member.id);
      if (result.success) {
        toast({ title: 'Success', description: `${member.name} has been kicked from the team.` });
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
      setIsKickAlertOpen(false);
    });
  };

  const handleChangeRole = (newRole: 'coach' | 'member') => {
    startTransition(async () => {
      const result = await changeUserRole(teamId, member.id, newRole);
      if (result.success) {
        toast({ title: 'Success', description: `${member.name}'s role has been updated to ${newRole}.` });
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
  }

  return (
    <>
      <AlertDialog open={isKickAlertOpen} onOpenChange={setIsKickAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to kick {member.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will remove them from the team permanently. They will not be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleKick} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isPending ? 'Kicking...' : 'Kick Member'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={!isFounder}>
                <Shield className="mr-2 h-4 w-4" />
                <span>Change Role</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => handleChangeRole('coach')} disabled={member.role === 'coach'}>
                    <Shield className="mr-2 h-4 w-4" /> Coach
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleChangeRole('member')} disabled={member.role === 'member'}>
                    <User className="mr-2 h-4 w-4" /> Member
                </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setIsKickAlertOpen(true)} className="text-destructive focus:text-destructive" disabled={!isFounder}>
            <UserX className="mr-2 h-4 w-4" />
            <span>Kick Member</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
