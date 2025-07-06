'use client';

import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EditProfileDialog } from '@/components/profile/edit-profile-dialog';
import { TeamInfoCard } from '@/components/profile/team-info-card';
import { HonorsSection } from '@/components/profile/honors-section';
import { BlockedUsersList } from '@/components/profile/blocked-users-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Globe, UserCog } from 'lucide-react';
import { getFlagEmoji } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function ProfilePage() {
  const { userProfile, loading } = useAuth();

  if (loading || !userProfile) {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
            </div>
            <Skeleton className="h-64 w-full" />
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                    <AvatarImage src={userProfile.avatarUrl} alt={userProfile.name} data-ai-hint="person avatar" />
                    <AvatarFallback>{userProfile.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle className="text-3xl font-headline">{userProfile.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                        <Globe className="h-4 w-4" /> 
                        {getFlagEmoji(userProfile.country || '')} {userProfile.country || 'No country set'}
                    </CardDescription>
                </div>
            </div>
            <EditProfileDialog userProfile={userProfile}>
                <Button variant="outline">Edit Profile</Button>
            </EditProfileDialog>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">{userProfile.bio || 'No bio provided.'}</p>
            <div className="flex flex-wrap gap-2 mt-4">
                {userProfile.skills?.map(skill => <Badge key={skill} variant="secondary">{skill}</Badge>)}
                {userProfile.rank && <Badge variant="outline">{userProfile.rank}</Badge>}
            </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HonorsSection targetUser={userProfile} />
        {userProfile.teamId && <TeamInfoCard teamId={userProfile.teamId} />}
      </div>

       <Tabs defaultValue="settings" className="w-full">
            <TabsList>
                <TabsTrigger value="settings"><UserCog className="mr-2 h-4 w-4"/>Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="settings">
                <Card>
                    <CardHeader>
                        <CardTitle>Blocked Users</CardTitle>
                        <CardDescription>Manage users you've blocked. They cannot see your profile or send you messages.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <BlockedUsersList blockedIds={userProfile.blocked || []} />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
  );
}
