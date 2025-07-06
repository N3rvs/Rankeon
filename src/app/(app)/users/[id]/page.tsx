'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { HonorsSection } from '@/components/profile/honors-section';
import { TeamInfoCard } from '@/components/profile/team-info-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Frown, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { FriendshipButton } from '@/components/friends/friendship-button';
import { SendMessageDialog } from '@/components/messages/send-message-dialog';
import { useRouter } from 'next/navigation';

export default function UserProfilePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { user } = useAuth();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);

  useEffect(() => {
    if (user?.uid === id) {
        router.replace('/profile');
    }

    let unsubscribe: Unsubscribe | undefined;
    if (id) {
      setLoading(true);
      const userRef = doc(db, 'users', id);
      unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserProfile({ id: docSnap.id, ...docSnap.data() } as UserProfile);
        } else {
          setUserProfile(null);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching user profile:", error);
        setUserProfile(null);
        setLoading(false);
      });
    }
    return () => unsubscribe?.();
  }, [id, user?.uid, router]);


  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <div className="lg:col-span-3 space-y-6">
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="text-center py-10">
        <Frown className="w-24 h-24 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold">User Not Found</h2>
        <p className="text-muted-foreground">The user you are looking for does not exist.</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Market
          </Link>
        </Button>
      </div>
    );
  }
  
  const getRoleVariant = (role: string) => {
    const variants: { [key: string]: 'founder' | 'coach' | 'moderator' | 'admin' | 'secondary' } = {
        founder: 'founder',
        coach: 'coach',
        moderator: 'moderator',
        admin: 'premium' as 'admin',
    };
    return variants[role] || 'secondary';
  }

  return (
    <>
        <SendMessageDialog recipient={userProfile} open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center text-center">
                            <Avatar className="h-24 w-24 mb-4">
                                <AvatarImage src={userProfile.avatarUrl} alt={userProfile.name} data-ai-hint="person avatar"/>
                                <AvatarFallback>{userProfile.name.slice(0, 2)}</AvatarFallback>
                            </Avatar>
                            <h2 className="text-2xl font-bold font-headline">{userProfile.name}</h2>
                            <div className="flex flex-wrap items-center justify-center gap-2 mt-1 text-sm text-muted-foreground">
                            {userProfile.role && <Badge variant={getRoleVariant(userProfile.role)} className="capitalize">{userProfile.role}</Badge>}
                            {userProfile.country && <span className="ml-1">{userProfile.country}</span>}
                            </div>
                        </div>
                        <p className="text-muted-foreground mt-4 text-center text-sm">{userProfile.bio || "This user hasn't set a bio yet."}</p>
                         <div className="flex flex-col gap-2 mt-4">
                            <FriendshipButton targetUser={userProfile} />
                            <Button variant="outline" onClick={() => setIsMessageDialogOpen(true)}>
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Message
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                {userProfile.teamId && <TeamInfoCard teamId={userProfile.teamId} />}
            </div>

            <div className="lg:col-span-2 space-y-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Skills & Rank</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                         {userProfile.skills?.map(skill => <Badge key={skill} variant="outline" className="text-base py-1 px-3">{skill}</Badge>)}
                         {userProfile.rank && <Badge variant="secondary" className="text-base py-1 px-3">{userProfile.rank}</Badge>}
                         {!userProfile.skills?.length && !userProfile.rank && <p className="text-sm text-muted-foreground">No skills or rank specified.</p>}
                    </CardContent>
                </Card>
                <HonorsSection targetUser={userProfile} />
            </div>
        </div>
    </>
  );
}
