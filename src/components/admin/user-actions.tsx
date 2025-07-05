
'use client';

import { useState, useTransition } from 'react';
import { MoreHorizontal, Edit, UserCheck, UserX, Twitch, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
import type { UserProfile } from '@/lib/types';
import { updateUserStatus, updateUserCertification } from '@/lib/actions/users';
import { useAuth } from '@/contexts/auth-context';
import { EditProfileDialog } from '../profile/edit-profile-dialog';
import { RoleManagementDialog } from './role-management-dialog';
import { BanUserDialog } from './ban-user-dialog';

interface UserActionsProps {
  user: UserProfile;
  currentUserRole: 'admin' | 'moderator';
}

export function UserActions({ user, currentUserRole }: UserActionsProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [isUnbanAlertOpen, setIsUnbanAlertOpen] = useState(false);
  const [isCertifyAlertOpen, setIsCertifyAlertOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isBanDialogOpen, setIsBanDialogOpen] = useState(false);

  const handleUnban = () => {
    startTransition(async () => {
      const result = await updateUserStatus({ uid: user.id, disabled: false });
      if (result.success) {
        toast({ title: 'Success', description: result.message });
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
      setIsUnbanAlertOpen(false);
    });
  };

  const handleCertificationToggle = () => {
    startTransition(async () => {
      const result = await updateUserCertification({ uid: user.id, isCertified: !user.isCertifiedStreamer });
      if (result.success) {
        toast({ title: 'Success', description: result.message });
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
      setIsCertifyAlertOpen(false);
    });
  };

  return (
    <>
      <BanUserDialog user={user} open={isBanDialogOpen} onOpenChange={setIsBanDialogOpen} />

      {currentUserRole === 'admin' && (
        <>
            <EditProfileDialog userProfile={user} open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} />
            <RoleManagementDialog user={user} open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen} />
        </>
      )}
      
      <AlertDialog open={isUnbanAlertOpen} onOpenChange={setIsUnbanAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unban {user.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will unban the user, allowing them to log back into the platform immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnban} disabled={isPending}>
              {isPending ? 'Processing...' : 'Yes, Unban User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isCertifyAlertOpen} onOpenChange={setIsCertifyAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              This action will {user.isCertifiedStreamer ? 'remove the certification from' : 'certify'} this user as a streamer, allowing them to propose tournaments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCertificationToggle} disabled={isPending}>
              {isPending ? 'Processing...' : `Yes, ${user.isCertifiedStreamer ? 'Remove Certification' : 'Certify User'}`}
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
            {currentUserRole === 'admin' && (
                <>
                    <DropdownMenuItem onSelect={() => setIsEditDialogOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        <span>Edit Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setIsRoleDialogOpen(true)}>
                        <UserCog className="mr-2 h-4 w-4" />
                        <span>Change Role</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setIsCertifyAlertOpen(true)}>
                        <Twitch className="mr-2 h-4 w-4" />
                        <span>{user.isCertifiedStreamer ? 'Remove Certification' : 'Certify Streamer'}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                </>
            )}
          {user.disabled ? (
            <DropdownMenuItem onSelect={() => setIsUnbanAlertOpen(true)} className="text-green-600 focus:text-green-700">
                <UserCheck className="mr-2 h-4 w-4" />
                <span>Unban User</span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => setIsBanDialogOpen(true)} className="text-destructive focus:text-destructive">
                <UserX className="mr-2 h-4 w-4" />
                <span>Ban User</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
