
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/client';
import { doc, getDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Twitch } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FriendshipButton } from '@/components/friends/friendship-button';
import { useAuth } from '@/contexts/auth-context';

export default function UserProfilePage() {
  const { userId } = useParams() as { userId: string };
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const userRef = doc(db, 'users', userId);
    getDoc(userRef).then(docSnap => {
        if (docSnap.exists()) {
          setUser({ id: docSnap.id, ...docSnap.data() } as UserProfile);
        } else {
          setUser(null);
          toast({
            title: 'Error',
            description: 'User not found.',
            variant: 'destructive',
          });
          router.push('/dashboard');
        }
        setLoading(false);
    }).catch(error => {
        console.error('Error fetching user profile:', error);
        setLoading(false);
    });

  }, [userId, router, toast]);

  if (loading) {
    return (
        <div className="space-y-6">
            <Button variant="ghost" disabled>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
            </Button>
            <Card>
                <CardHeader className="flex flex-col items-center text-center space-y-4">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <div>
                        <Skeleton className="h-8 w-48 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </CardHeader>
                <CardContent className="mt-4 border-t pt-6">
                     <Skeleton className="h-48 w-full" />
                </CardContent>
            </Card>
        </div>
    );
  }

  if (!user) {
    return null; // Redirect is handled in effect
  }
  
  const isOwnProfile = currentUser?.uid === user.id;

  return (
    <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
        </Button>

        <Card>
            <CardHeader className="flex flex-col items-center text-center space-y-4">
                <Avatar className="h-24 w-24 border-4 border-primary">
                    <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person avatar" />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle className="text-3xl font-headline">{user.name}</CardTitle>
                    <CardDescription className="flex items-center justify-center gap-2 mt-1">
                        <Badge variant="default" className="capitalize">{user.role}</Badge>
                         {user.isCertifiedStreamer && (
                            <Badge variant="outline" className="border-purple-500/50 bg-purple-500/10 text-purple-400">
                                <Twitch className="mr-1 h-3 w-3" />
                                Certified
                            </Badge>
                        )}
                        <span className="text-muted-foreground">{user.email}</span>
                    </CardDescription>
                </div>
                 {!isOwnProfile && (
                     <FriendshipButton targetUser={user} />
                 )}
            </CardHeader>
            <CardContent className="mt-4 border-t pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 space-y-4">
                        <div>
                            <h3 className="font-semibold font-headline mb-2">About</h3>
                            <p className="text-muted-foreground text-sm">{user.bio || 'No bio yet.'}</p>
                        </div>
                         <div>
                            <h3 className="font-semibold font-headline mb-2">Status</h3>
                            <Badge variant={user.lookingForTeam ? 'default' : 'secondary'}>
                                {user.lookingForTeam ? 'Actively Looking' : 'Not Currently Looking'}
                            </Badge>
                        </div>
                    </div>
                    <div className="md:col-span-1">
                        <h3 className="font-semibold font-headline mb-2">Primary Games</h3>
                        <div className="flex flex-wrap gap-2">
                            {user.games && user.games.length > 0 ? user.games.map(game => (
                                <Badge key={game} variant="secondary">{game}</Badge>
                            )) : <p className="text-sm text-muted-foreground">No games added yet.</p>}
                        </div>
                    </div>
                    <div className="md:col-span-1">
                        <h3 className="font-semibold font-headline mb-2">Skills / Roles</h3>
                        <div className="flex flex-wrap gap-2">
                            {user.skills && user.skills.length > 0 ? user.skills.map(skill => (
                                <Badge key={skill} variant="outline">{skill}</Badge>
                            )) : <p className="text-sm text-muted-foreground">No skills added yet.</p>}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
  )
}
