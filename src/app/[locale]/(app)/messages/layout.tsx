
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase/client';
import { doc, getDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

function ChatSidebar() {
    const { user, userProfile, loading: authLoading } = useAuth();
    const [friends, setFriends] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();

    useEffect(() => {
        if (!userProfile?.friends || userProfile.friends.length === 0) {
            setLoading(false);
            setFriends([]);
            return;
        }

        let isMounted = true;
        setLoading(true);
        
        const fetchFriends = async () => {
            const friendPromises = userProfile.friends!.map(friendId => getDoc(doc(db, 'users', friendId)));
            try {
                const friendDocs = await Promise.all(friendPromises);
                const friendProfiles = friendDocs
                    .filter(snap => snap.exists())
                    .map(snap => ({ id: snap.id, ...snap.data() } as UserProfile));
                
                if (isMounted) {
                    setFriends(friendProfiles);
                }
            } catch (error) {
                console.error("Error fetching friends' profiles:", error);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        if (user) {
            fetchFriends();
        } else {
            setLoading(false);
        }

        return () => { isMounted = false; };
    }, [user, userProfile?.friends]);
    
    const getChatId = (friendId: string) => {
        if (!user) return '';
        return [user.uid, friendId].sort().join('_');
    };

    if (authLoading || loading) {
        return (
            <div className="p-4 space-y-4">
                <Skeleton className="h-4 w-1/3 mb-2" />
                {[...Array(5)].map((_, i) => (
                     <div key={i} className="flex items-center gap-3 p-2">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                ))}
            </div>
        )
    }

    return (
        <ScrollArea className="flex-1">
            <nav className="p-2 space-y-1">
                {friends.length > 0 ? (
                    friends.map(friend => (
                        <Link
                            key={friend.id}
                            href={`/messages/${getChatId(friend.id)}`}
                            className={cn(
                                "flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-muted",
                                pathname === `/messages/${getChatId(friend.id)}` && "bg-muted"
                            )}
                        >
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={friend.avatarUrl} data-ai-hint="person avatar"/>
                                <AvatarFallback>{friend.name.slice(0,2)}</AvatarFallback>
                            </Avatar>
                            <p className="font-semibold text-sm">{friend.name}</p>
                        </Link>
                    ))
                ) : (
                    <p className="p-4 text-sm text-center text-muted-foreground">No tienes amigos. Añade amigos desde el mercado para empezar a chatear.</p>
                )}
            </nav>
        </ScrollArea>
    )
}


export default function MessagesLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="h-[calc(100vh-8rem)]">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 h-full rounded-lg border bg-card">
                <div className="col-span-1 flex flex-col border-r h-full">
                    <div className="p-4 border-b flex items-center h-16">
                         <h2 className="text-xl font-bold font-headline flex items-center gap-2">
                            Mensajes Directos
                        </h2>
                    </div>
                    <ChatSidebar />
                </div>
                <div className="col-span-1 md:col-span-2 lg:col-span-3 h-full">
                    {children}
                </div>
            </div>
        </div>
    );
}
