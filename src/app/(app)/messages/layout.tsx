
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase/client';
import { collection, query, where, orderBy, onSnapshot, getDoc, doc } from 'firebase/firestore';
import type { UserProfile, Chat, UserStatus } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useI18n } from '@/contexts/i18n-context';

interface EnrichedChat extends Chat {
    partner: UserProfile | null;
}

function ChatList() {
    const { user, userProfile, loading: authLoading } = useAuth();
    const { t } = useI18n();
    const pathname = usePathname();

    const [unreadChatIds, setUnreadChatIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    const [friendProfiles, setFriendProfiles] = useState<UserProfile[]>([]);
    const [chatsMap, setChatsMap] = useState<Map<string, Chat>>(new Map());
    
    const [onlineFriends, setOnlineFriends] = useState<EnrichedChat[]>([]);
    const [offlineFriends, setOfflineFriends] = useState<EnrichedChat[]>([]);


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

    // Effect 1: Fetch and update friend profiles when the friends list changes
    useEffect(() => {
        if (!userProfile?.friends) {
            setFriendProfiles([]);
            setLoading(false);
            return;
        }

        setLoading(true);

        const friendIds = userProfile.friends || [];
        if (friendIds.length === 0) {
            setFriendProfiles([]);
            setLoading(false);
            return;
        }
        
        const unsubscribes = friendIds.map(id => {
            const docRef = doc(db, 'users', id);
            return onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    const friendData = { id: docSnap.id, ...docSnap.data() } as UserProfile;
                    setFriendProfiles(currentFriends => {
                        const existingFriendIndex = currentFriends.findIndex(f => f.id === id);
                        if (existingFriendIndex > -1) {
                            const updatedFriends = [...currentFriends];
                            updatedFriends[existingFriendIndex] = friendData;
                            return updatedFriends;
                        } else {
                            return [...currentFriends, friendData];
                        }
                    });
                } else {
                     setFriendProfiles(currentFriends => currentFriends.filter(f => f.id !== id));
                }
            });
        });
        
        setLoading(false);

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [JSON.stringify(userProfile?.friends)]);

    // Effect 2: Listen for all chat updates for the current user
    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'chats'), where('members', 'array-contains', user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newChatsMap = new Map<string, Chat>();
            snapshot.forEach(doc => {
                newChatsMap.set(doc.id, { id: doc.id, ...doc.data() } as Chat);
            });
            setChatsMap(newChatsMap);
        });
        return () => unsubscribe();
    }, [user]);

    // Effect 3: Combine friend profiles and chat data, and categorize them
    useEffect(() => {
        if (!user) return;

        const combined = friendProfiles.map(friend => {
            const chatId = [user.uid, friend.id].sort().join('_');
            const chatData = chatsMap.get(chatId);
            return {
                id: chatId,
                partner: friend,
                members: [user.uid, friend.id],
                lastMessage: chatData?.lastMessage,
                lastMessageAt: chatData?.lastMessageAt,
                createdAt: chatData?.createdAt,
            };
        }).sort((a, b) => {
            const timeA = a.lastMessageAt?.toMillis() || a.createdAt?.toMillis() || 0;
            const timeB = b.lastMessageAt?.toMillis() || b.createdAt?.toMillis() || 0;
            return timeB - timeA;
        });
        
        const online = combined.filter(c => c.partner?.status && ['available', 'busy', 'away'].includes(c.partner.status));
        const offline = combined.filter(c => !c.partner?.status || !['available', 'busy', 'away'].includes(c.partner.status));

        setOnlineFriends(online);
        setOfflineFriends(offline);

    }, [friendProfiles, chatsMap, user]);


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

    const ChatLink = ({ chat }: { chat: EnrichedChat }) => {
        const { partner } = chat;
        if (!partner) return null;

        const isUnread = unreadChatIds.has(chat.id);
        const isLastMessageFromMe = chat.lastMessage?.sender === user?.uid;
        
        const statusConfig: { [key in UserStatus | 'default']: string } = {
            available: 'bg-green-500',
            busy: 'bg-red-500',
            away: 'bg-yellow-400',
            offline: 'bg-gray-400',
            default: 'bg-gray-400'
        };

        const statusColor = statusConfig[partner.status || 'offline'] || statusConfig.default;

        return (
            <Link
                key={chat.id}
                href={`/messages/${chat.id}`}
                className={cn(
                    "flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-muted",
                    pathname.endsWith(`/messages/${chat.id}`) && "bg-muted"
                )}
            >
                 <div className="relative flex-shrink-0">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={partner.avatarUrl} data-ai-hint="person avatar"/>
                        <AvatarFallback>{partner.name.slice(0,2)}</AvatarFallback>
                    </Avatar>
                     <span className={cn(
                        "absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-card",
                        statusColor
                    )} />
                </div>
                <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-center">
                        <div className={cn("font-semibold text-sm truncate", isUnread && "text-primary")}>
                            {partner.name}
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
                            t('MessagesPage.say_hello')
                        )}
                    </p>
                </div>
            </Link>
        )
    };

    return (
        <ScrollArea className="flex-1">
            <nav className="p-2 space-y-1">
                {(onlineFriends.length + offlineFriends.length) > 0 ? (
                    <>
                        {onlineFriends.length > 0 && (
                            <div>
                                <h3 className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Online — {onlineFriends.length}</h3>
                                {onlineFriends.map(chat => <ChatLink key={chat.id} chat={chat} />)}
                            </div>
                        )}

                        {offlineFriends.length > 0 && (
                            <div className="pt-2">
                                <h3 className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Offline — {offlineFriends.length}</h3>
                                {offlineFriends.map(chat => <ChatLink key={chat.id} chat={chat} />)}
                            </div>
                        )}
                    </>
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
