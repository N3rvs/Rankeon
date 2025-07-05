'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { EditProfileDialog } from "@/components/profile/edit-profile-dialog";
import { ListX, ShieldCheck, Twitch } from "lucide-react";
import { BlockedUsersList } from "@/components/profile/blocked-users-list";

export default function ProfilePage() {
    const { userProfile, loading, claims } = useAuth();

    if (loading || !userProfile) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader className="flex flex-col items-center text-center space-y-4">
                        <Skeleton className="h-24 w-24 rounded-full" />
                        <div>
                            <Skeleton className="h-8 w-48 mb-2" />
                            <Skeleton className="h-4 w-64" />
                        </div>
                        <Skeleton className="h-10 w-32" />
                    </CardHeader>
                    <CardContent className="mt-4 border-t pt-6">
                         <Skeleton className="h-48 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    const user = userProfile;
    const isAdmin = claims?.role === 'admin';

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-col items-center text-center space-y-4">
                    <Avatar className="h-24 w-24 border-4 border-primary">
                        <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="male avatar" />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="text-3xl font-headline">{user.name}</CardTitle>
                        <CardDescription className="flex items-center justify-center gap-2 mt-1">
                            {isAdmin ? (
                                <Badge variant="destructive" className="capitalize">
                                    <ShieldCheck className="mr-1 h-3 w-3" />
                                    Admin
                                </Badge>
                            ) : (
                                <Badge variant="default" className="capitalize">{user.role}</Badge>
                            )}
                            {user.isCertifiedStreamer && (
                                <Badge variant="outline" className="border-purple-500/50 bg-purple-500/10 text-purple-400">
                                    <Twitch className="mr-1 h-3 w-3" />
                                    Certified
                                </Badge>
                            )}
                            <span className="text-muted-foreground">{user.email}</span>
                        </CardDescription>
                    </div>
                    <EditProfileDialog userProfile={user} />
                </CardHeader>
                <CardContent className="mt-4 border-t pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1 space-y-4">
                            <div>
                                <h3 className="font-semibold font-headline mb-2">About Me</h3>
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

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <ListX className="h-6 w-6 text-muted-foreground" />
                        <div>
                            <CardTitle className="font-headline text-2xl">Blocked Users</CardTitle>
                            <CardDescription>Manage users you have blocked.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <BlockedUsersList blockedIds={user.blocked || []} />
                </CardContent>
            </Card>
        </div>
    )
}
