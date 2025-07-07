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
import { useI18n } from '@/contexts/i18n-context';

function ChatList() {
    const { user, loading: authLoading } = useAuth();
    const { t } = useI18n();
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

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const chatMap = new Map<string, Chat>();
            snapshot.docs.forEach(doc => {
                chatMap.set(doc.id, { id: doc.id, ...doc.data() } as Chat);
            });
            const initialChats = Array.from(chatMap.values());
            
            const sortedChats = initialChats.sort((a, b) => {
                const timeA = a.lastMessageAt?.toMillis() || a.createdAt?.toMillis() || 0;
                const timeB = b.lastMessageAt?.toMillis() || b.createdAt?.toMillis() || 0;
                return timeB - timeA;
            });
            setChats(sortedChats);

            // Fetch partner profiles for any new chats
            setChatPartners(currentPartners => {
                const newPartnerIds = sortedChats
                    .map(chat => chat.members.find(id => id !== user.uid))
                    .filter((id): id is string => !!id && !currentPartners.has(id));

                if (newPartnerIds.length > 0) {
                    const uniquePartnerIds = [...new Set(newPartnerIds)];
                    const profilePromises = uniquePartnerIds.map(id => getDoc(doc(db, 'users', id)));
                    
                    Promise.all(profilePromises).then(profileDocs => {
                        setChatPartners(prevPartners => {
                            const newPartnersMap = new Map(prevPartners);
                            profileDocs.forEach(docSnap => {
                                if (docSnap.exists()) {
                                    newPartnersMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as UserProfile);
                                }
                            });
                            return newPartnersMap;
                        });
                    });
                }
                return currentPartners;
            });
            
            setLoading(false);
        }, (error) => {
            console.error("Error fetching chats:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

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
                                    {partner ? <>
                                        <AvatarImage src={partner.avatarUrl} data-ai-hint="person avatar"/>
                                        <AvatarFallback>{partner.name.slice(0,2)}</AvatarFallback>
                                    </> : <Skeleton className="h-full w-full rounded-full" />}
                                </Avatar>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex justify-between items-center">
                                        <div className={cn("font-semibold text-sm truncate", isUnread && "text-primary")}>
                                            {partner ? partner.name : <Skeleton className="h-4 w-24" />}
                                        </div>
                                        {(chat.lastMessageAt || chat.createdAt) && (
                                            <p className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                                {formatDistanceToNow((chat.lastMessageAt || chat.createdAt)!.toDate(), { addSuffix: true })}
                                            </p>
                                        )}
                                    </div>
                                    <p className={cn(
                                        "text-sm text-muted-foreground truncate",
                                        isUnread && !isLastMessageFromMe && "text-foreground font-medium"
                                    )}>
                                        {chat.lastMessage ? (
                                            <>
                                                {isLastMessageFromMe && t('MessagesPage.you_prefix')}
                                                {chat.lastMessage.content}
                                            </>
                                        ) : (
                                            'Chat created. Say hello!'
                                        )}
                                    </p>
                                </div>
                            </Link>
                        )
                    })
                ) : (
                    <p className="p-4 text-sm text-center text-muted-foreground">{t('MessagesPage.no_conversations')}</p>
                )}
            </nav>
        </ScrollArea>
    )
}


export default function MessagesLayout({ children }: { children: React.ReactNode }) {
    const { t } = useI18n();
    return (
        <div className="h-[calc(100vh-8rem)]">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 h-full rounded-lg border bg-card">
                <div className="col-span-1 flex flex-col border-r h-full">
                    <div className="p-4 border-b flex items-center h-16">
                         <h2 className="text-xl font-bold font-headline flex items-center gap-2">
                            {t('MessagesPage.direct_messages')}
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
