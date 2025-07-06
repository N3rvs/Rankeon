'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase/client';
import { collection, query, where, orderBy, onSnapshot, getDoc, doc } from 'firebase/firestore';
import type { UserProfile, Chat } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

function ChatList() {
    const { user, loading: authLoading } = useAuth();
    const [chats, setChats] = useState<Chat[]>([]);
    const [chatPartners, setChatPartners] = useState<Map<string, UserProfile>>(new Map());
    const [unreadChatIds, setUnreadChatIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();

    useEffect(() => {
        if (!user) {
            setUnreadChatIds(new Set());
            return;
        }
        const q = query(
            collection(db, 'inbox', user.uid, 'notifications'),
            where('read', '==', false),
            where('type', '==', 'new_message')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const unreadIds = new Set(snapshot.docs.map(doc => doc.data().chatId));
            setUnreadChatIds(unreadIds);
        });
        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            setChats([]);
            return;
        }
        setLoading(true);
        const q = query(
            collection(db, 'chats'),
            where('members', 'array-contains', user.uid)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const initialChats = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Chat))
                .filter(chat => !!chat.lastMessage);
            
            const chatMap = new Map<string, Chat>();
            initialChats.forEach(doc => {
                chatMap.set(doc.id, doc);
            });

            const sortedChats = Array.from(chatMap.values()).sort((a, b) => {
                const timeA = a.lastMessageAt?.toMillis() || a.createdAt?.toMillis() || 0;
                const timeB = b.lastMessageAt?.toMillis() || b.createdAt?.toMillis() || 0;
                return timeB - timeA;
            });
            setChats(sortedChats);

            const partnerIdsToFetch = sortedChats
                .map(chat => chat.members.find(id => id !== user.uid))
                .filter((id): id is string => !!id && !chatPartners.has(id));
            
            if (partnerIdsToFetch.length > 0) {
                const uniquePartnerIds = [...new Set(partnerIdsToFetch)];
                const profilePromises = uniquePartnerIds.map(id => getDoc(doc(db, 'users', id)));
                const profileDocs = await Promise.all(profilePromises);
                
                setChatPartners(prevPartners => {
                    const newPartners = new Map(prevPartners);
                    profileDocs.forEach(docSnap => {
                        if (docSnap.exists()) {
                            newPartners.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as UserProfile);
                        }
                    });
                    return newPartners;
                });
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching chats:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, chatPartners]);

    if (authLoading || loading) {
        return (
            <div className="p-4 space-y-4">
                {[...Array(5)].map((_, i) => (
                     <div key={i} className="flex items-center gap-3 p-2">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
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
                {chats.length > 0 ? (
                    chats.map(chat => {
                        const partnerId = chat.members.find(id => id !== user?.uid);
                        if (!partnerId) return null;
                        
                        const partner = chatPartners.get(partnerId);
                        if (!partner) return null;

                        const isUnread = unreadChatIds.has(chat.id);
                        const isLastMessageFromMe = chat.lastMessage?.sender === user?.uid;

                        return (
                            <Link
                                key={chat.id}
                                href={`/messages/${chat.id}`}
                                className={cn(
                                    "flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-muted",
                                    pathname.endsWith(`/messages/${chat.id}`) && "bg-muted"
                                )}
                            >
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={partner.avatarUrl} data-ai-hint="person avatar"/>
                                    <AvatarFallback>{partner.name.slice(0,2)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex justify-between items-center">
                                        <p className={cn("font-semibold text-sm truncate", isUnread && "text-primary")}>{partner.name}</p>
                                        {chat.lastMessageAt && (
                                            <p className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                                {formatDistanceToNow(chat.lastMessageAt.toDate(), { addSuffix: true })}
                                            </p>
                                        )}
                                    </div>
                                    <p className={cn(
                                        "text-sm text-muted-foreground truncate",
                                        isUnread && !isLastMessageFromMe && "text-foreground font-medium"
                                    )}>
                                        {isLastMessageFromMe && "Tú: "}{chat.lastMessage?.content || '...'}
                                    </p>
                                </div>
                            </Link>
                        )
                    })
                ) : (
                    <p className="p-4 text-sm text-center text-muted-foreground">No tienes conversaciones. Añade amigos desde el mercado para empezar a chatear.</p>
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
                    <ChatList />
                </div>
                <div className="col-span-1 md:col-span-2 lg:col-span-3 h-full">
                    {children}
                </div>
            </div>
        </div>
    );
}
