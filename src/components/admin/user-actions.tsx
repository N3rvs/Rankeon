'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, MessageSquare, Edit, UserCheck, UserX } from 'lucide-react';
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
import { updateUserStatus } from '@/lib/actions/users';
import { useAuth } from '@/contexts/auth-context';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { EditProfileDialog } from '../profile/edit-profile-dialog';

interface UserActionsProps {
  user: UserProfile;
}

export function UserActions({ user }: UserActionsProps) {
  const { user: currentUser, userProfile: currentUserProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
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
      setIsAlertOpen(false);
    });
  };

  const handleMessageUser = async () => {
    if (!currentUser || !currentUserProfile) {
        toast({ title: 'Authentication Error', description: 'You must be logged in to message a player.', variant: 'destructive' });
        return;
    }
    
    startTransition(async () => {
        try {
            const conversationId = [currentUser.uid, user.id].sort().join('_');
            const conversationRef = doc(db, 'conversations', conversationId);
            const docSnap = await getDoc(conversationRef);

            if (!docSnap.exists()) {
                await setDoc(conversationRef, {
                    participantIds: [currentUser.uid, user.id],
                    participants: {
                        [currentUser.uid]: {
                        name: currentUserProfile.name,
                        avatarUrl: currentUserProfile.avatarUrl,
                        },
                        [user.id]: {
                        name: user.name,
                        avatarUrl: user.avatarUrl,
                        }
                    },
                    lastMessage: null,
                });
            }
            router.push('/messages');
        } catch (error) {
            console.error("Error starting conversation: ", error);
            toast({ title: 'Error', description: 'Could not start a conversation. Please try again.', variant: 'destructive' });
        }
    });
  };

  return (
    <>
      <EditProfileDialog userProfile={user} open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} />
      
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
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
          <DropdownMenuItem onSelect={handleMessageUser} disabled={isPending}>
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>Message</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setIsAlertOpen(true)} className={user.disabled ? "text-green-600 focus:text-green-700" : "text-destructive focus:text-destructive"}>
            {user.disabled ? <UserCheck className="mr-2 h-4 w-4" /> : <UserX className="mr-2 h-4 w-4" />}
            <span>{user.disabled ? 'Unban' : 'Ban'} User</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
