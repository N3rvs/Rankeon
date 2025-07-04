'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Edit, UserCheck, UserX, Award } from 'lucide-react';
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

interface UserActionsProps {
  user: UserProfile;
}

export function UserActions({ user }: UserActionsProps) {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isBanAlertOpen, setIsBanAlertOpen] = useState(false);
  const [isCertifyAlertOpen, setIsCertifyAlertOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleBanToggle = () => {
    startTransition(async () => {
      const result = await updateUserStatus({ uid: user.id, disabled: !user.disabled });
      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
      setIsBanAlertOpen(false);
    });
  };

  const handleCertificationToggle = () => {
    startTransition(async () => {
      const result = await updateUserCertification({ uid: user.id, isCertified: !user.isCertifiedStreamer });
      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
      setIsCertifyAlertOpen(false);
    });
  };

  return (
    <>
      <EditProfileDialog userProfile={user} open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} />
      
      <AlertDialog open={isBanAlertOpen} onOpenChange={setIsBanAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will {user.disabled ? 'unban' : 'ban'} the user, {user.disabled ? 'allowing' : 'preventing'} them from logging in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBanToggle} disabled={isPending} className={user.disabled ? '' : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}>
              {isPending ? 'Processing...' : `Yes, ${user.disabled ? 'Unban' : 'Ban'} User`}
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
          <DropdownMenuItem onSelect={() => setIsEditDialogOpen(true)}>
             <Edit className="mr-2 h-4 w-4" />
            <span>Edit Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setIsCertifyAlertOpen(true)}>
            <Award className="mr-2 h-4 w-4" />
            <span>{user.isCertifiedStreamer ? 'Remove Certification' : 'Certify Streamer'}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setIsBanAlertOpen(true)} className={user.disabled ? "text-green-600 focus:text-green-700" : "text-destructive focus:text-destructive"}>
            {user.disabled ? <UserCheck className="mr-2 h-4 w-4" /> : <UserX className="mr-2 h-4 w-4" />}
            <span>{user.disabled ? 'Unban' : 'Ban'} User</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
