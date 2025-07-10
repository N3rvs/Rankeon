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
import { useI18n } from '@/contexts/i18n-context';

interface EditProfileDialogProps {
    userProfile: UserProfile;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children?: React.ReactNode;
}

export function EditProfileDialog({ userProfile, open, onOpenChange, children }: EditProfileDialogProps) {
  const { userProfile: loggedInUserProfile } = useAuth();
  const { t } = useI18n();
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = open !== undefined && onOpenChange !== undefined;
  const currentOpen = isControlled ? open : internalOpen;
  const setCurrentOpen = isControlled ? onOpenChange! : setInternalOpen;

  const isEditingSelf = loggedInUserProfile?.id === userProfile.id;

  const getTitle = () => {
    if (isEditingSelf) return t('EditProfileDialog.title_self');
    return t('EditProfileDialog.title_other', { name: userProfile.name });
  }

  return (
    <Dialog open={currentOpen} onOpenChange={setCurrentOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {children || (
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              {t('ProfilePage.edit_profile')}
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {getTitle()}
          </DialogTitle>
          <DialogDescription>
            {t('EditProfileDialog.description')}
          </DialogDescription>
        </DialogHeader>
        <EditProfileForm userProfile={userProfile} onFinished={() => setCurrentOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
