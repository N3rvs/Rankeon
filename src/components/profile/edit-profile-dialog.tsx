'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import { EditProfileForm } from './edit-profile-form';
import type { UserProfile } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';

interface EditProfileDialogProps {
    userProfile: UserProfile;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function EditProfileDialog({ userProfile, open, onOpenChange }: EditProfileDialogProps) {
  const { userProfile: loggedInUserProfile } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = open !== undefined && onOpenChange !== undefined;
  const currentOpen = isControlled ? open : internalOpen;
  const setCurrentOpen = isControlled ? onOpenChange! : setInternalOpen;

  const isEditingSelf = loggedInUserProfile?.id === userProfile.id;

  return (
    <Dialog open={currentOpen} onOpenChange={setCurrentOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button>
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditingSelf ? 'Edit Your Profile' : `Edit ${userProfile.name}'s Profile`}
          </DialogTitle>
          <DialogDescription>
            Make changes to the profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <EditProfileForm userProfile={userProfile} onFinished={() => setCurrentOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
