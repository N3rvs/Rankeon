'use client';

import type { UserProfile } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EditProfileDialog } from './edit-profile-dialog';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { Edit, Twitch } from 'lucide-react';
import { useI18n } from '@/contexts/i18n-context';

export function UserProfileCard({ userProfile }: { userProfile: UserProfile }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const isOwnProfile = user?.uid === userProfile.id;

  const getRoleVariant = (role: string) => {
    const variants: { [key: string]: 'player' | 'founder' | 'coach' | 'moderator' | 'admin' | 'secondary' } = {
        player: 'player',
        founder: 'founder',
        coach: 'coach',
        moderator: 'moderator',
        admin: 'premium' as 'admin',
    };
    return variants[role] || 'secondary';
  }

  return (
    <Card className="relative">
      {isOwnProfile && (
        <div className="absolute top-3 right-3">
          <EditProfileDialog userProfile={userProfile}>
            <Button variant="ghost" size="icon">
              <Edit className="h-4 w-4" />
              <span className="sr-only">{t('ProfilePage.edit_profile')}</span>
            </Button>
          </EditProfileDialog>
        </div>
      )}
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={userProfile.avatarUrl} alt={userProfile.name} data-ai-hint="person avatar"/>
            <AvatarFallback>{userProfile.name.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold font-headline flex items-center gap-2">
              <span>{userProfile.name}</span>
              {userProfile.isCertifiedStreamer && <Twitch className="h-5 w-5 text-purple-500" />}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
               {userProfile.role && <Badge variant={getRoleVariant(userProfile.role)} className="capitalize">{userProfile.role}</Badge>}
               {userProfile.country && <span className="ml-1">{userProfile.country}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2">
                {userProfile.skills?.map(skill => <Badge key={skill} variant="outline">{skill}</Badge>)}
            </div>
          </div>
        </div>
        <p className="text-muted-foreground mt-4">{userProfile.bio || t('ProfilePage.bio_placeholder')}</p>
      </CardContent>
    </Card>
  );
}
