
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase/client';
import { collection, query, where, onSnapshot, doc, getDoc, Unsubscribe } from 'firebase/firestore';
import type { UserProfile, Chat } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

function ChatSidebar() {
    const { user, loading: authLoading } = useAuth();
    const [chats, setChats] = useState<(Chat & { otherUser: UserProfile })[]>([]);
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        let isMounted = true;
        setLoading(true);
        
        const chatsQuery = query(
            collection(db, 'chats'), 
            where('members', 'array-contains', user.uid)
        );

        const unsubscribeChats = onSnapshot(chatsQuery, async (snapshot) => {
            if (snapshot.empty) {
                if (isMounted) {
                    setChats([]);
                    setLoading(false);
                }
                return;
            }
            let chatsData = snapshot.docs.map(d => ({ id: d.id, ...d.data({serverTimestamps: 'estimate'}) } as Chat));

            chatsData.sort((a, b) => (b.lastMessageAt?.toMillis() || 0) - (a.lastMessageAt?.toMillis() || 0));

            const chatPromises = chatsData.map(async (chat) => {
                const otherUserId = chat.members.find(id => id !== user.uid);
                if (!otherUserId) return null;
                const userDoc = await getDoc(doc(db, 'users', otherUserId));
                if (!userDoc.exists()) return null; // Filter out chats with deleted users
                
                return { ...chat, otherUser: { id: userDoc.id, ...userDoc.data() } as UserProfile };
            });

            const chatsWithUsers = (await Promise.all(chatPromises)).filter(Boolean) as (Chat & { otherUser: UserProfile })[];
            
            if (isMounted) {
                setChats(chatsWithUsers);
                setLoading(false);
            }
        }, (error) => {
            console.error("Error fetching chats: ", error);
            if (isMounted) {
                setLoading(false);
            }
        });

        return () => {
            isMounted = false;
            unsubscribeChats();
        };

    }, [user]);


    if (authLoading || loading) {
        return (
            <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                     <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-1">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <ScrollArea className="flex-1">
            <nav className="p-2 space-y-1">
                {chats.length > 0 ? chats.map(chat => (
                    <Link
                        key={chat.id}
                        href={`/messages/${chat.id}`}
                        className={cn(
                            "flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-muted",
                            pathname === `/messages/${chat.id}` && "bg-muted"
                        )}
                    >
                        <Avatar>
                            <AvatarImage src={chat.otherUser.avatarUrl} data-ai-hint="person avatar"/>
                            <AvatarFallback>{chat.otherUser.name.slice(0,2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 truncate">
                            <p className="font-semibold text-sm">{chat.otherUser.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{chat.lastMessage?.content}</p>
                        </div>
                        {chat.lastMessageAt && (
                            <p className="text-xs text-muted-foreground self-start shrink-0">
                                {formatDistanceToNow(chat.lastMessageAt.toDate(), { addSuffix: true, includeSeconds: true })
                                    .replace('about a minute', '1m')
                                    .replace('less than a minute', 'now')
                                    .replace(' minutes', 'm')
                                    .replace(' minute', 'm')
                                }
                            </p>
                        )}
                    </Link>
                )) : (
                    <p className="p-4 text-sm text-center text-muted-foreground">No hay chats activos. Envía un mensaje a un amigo.</p>
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
                    <div className="p-4 border-b">
                         <h2 className="text-xl font-bold font-headline flex items-center gap-2">
                            <Users />
                            Chats
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
