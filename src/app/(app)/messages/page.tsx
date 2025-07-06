'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase/client';
import { collection, query, where, onSnapshot, doc, getDoc, Unsubscribe } from 'firebase/firestore';
import type { UserProfile, Chat, FriendRequest } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Users, Check, X } from 'lucide-react';
import { respondToFriendRequest } from '@/lib/actions/friends';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

export default function MessagesPage() {
    const { user, userProfile, loading: authLoading } = useAuth();
    const [friends, setFriends] = useState<UserProfile[]>([]);
    const [requests, setRequests] = useState<(FriendRequest & { fromUser?: UserProfile })[]>([]);
    const [chats, setChats] = useState<(Chat & { otherUser?: UserProfile })[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }
        setLoading(true);

        const fetchFriends = async () => {
            if (userProfile?.friends && userProfile.friends.length > 0) {
                const friendPromises = userProfile.friends.map(id => getDoc(doc(db, 'users', id)));
                const friendDocs = await Promise.all(friendPromises);
                setFriends(friendDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() } as UserProfile)));
            } else {
                setFriends([]);
            }
        };

        const requestsQuery = query(collection(db, 'friendRequests'), where('to', '==', user.uid), where('status', '==', 'pending'));
        const unsubscribeRequests = onSnapshot(requestsQuery, async (snapshot) => {
            const reqsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FriendRequest));
            const reqsWithUsers = await Promise.all(reqsData.map(async (req) => {
                const userDoc = await getDoc(doc(db, 'users', req.from));
                return { ...req, fromUser: userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } as UserProfile : undefined };
            }));
            setRequests(reqsWithUsers);
        });
        
        const chatsQuery = query(collection(db, 'chats'), where('members', 'array-contains', user.uid));
        const unsubscribeChats = onSnapshot(chatsQuery, async (snapshot) => {
            const chatsData = snapshot.docs.map(d => ({ id: d.id, ...d.data({serverTimestamps: 'estimate'}) } as Chat));
            
            // Client-side sorting as a workaround for missing Firestore index
            chatsData.sort((a, b) => {
                const timeA = a.lastMessageAt?.toMillis() || 0;
                const timeB = b.lastMessageAt?.toMillis() || 0;
                return timeB - timeA;
            });
            const limitedChats = chatsData.slice(0, 20);

            const chatsWithUsers = await Promise.all(limitedChats.map(async (chat) => {
                const otherUserId = chat.members.find(id => id !== user.uid);
                if (!otherUserId) return chat;
                const userDoc = await getDoc(doc(db, 'users', otherUserId));
                return { ...chat, otherUser: userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } as UserProfile : undefined };
            }));
            setChats(chatsWithUsers);
        });

        fetchFriends().finally(() => setLoading(false));

        return () => {
            unsubscribeRequests();
            unsubscribeChats();
        };

    }, [user, userProfile?.friends]);

    const { toast } = useToast();

    const handleRequestResponse = async (requestId: string, accept: boolean) => {
        const result = await respondToFriendRequest({ requestId, accept });
        if (!result.success) {
            toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
    };
    
    if (authLoading || loading) {
        return <Skeleton className="h-96 w-full" />;
    }

    return (
        <div className="space-y-6">
             <div>
                <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-2">
                    <Users /> Amigos y Mensajes
                </h1>
                <p className="text-muted-foreground">
                    Gestiona tus amigos y conversaciones.
                </p>
            </div>
            <Tabs defaultValue="friends" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="friends">Amigos ({friends.length})</TabsTrigger>
                    <TabsTrigger value="chats">Chats ({chats.length})</TabsTrigger>
                    <TabsTrigger value="requests">Solicitudes ({requests.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="friends">
                    <Card>
                        <CardHeader><CardTitle>Lista de Amigos</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {friends.length > 0 ? friends.map(friend => (
                                <Card key={friend.id} className="p-4 flex items-center justify-between">
                                    <Link href={`/users/${friend.id}`} className="flex items-center gap-3 group">
                                        <Avatar>
                                            <AvatarImage src={friend.avatarUrl} data-ai-hint="person avatar"/>
                                            <AvatarFallback>{friend.name.slice(0,2)}</AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium group-hover:underline">{friend.name}</span>
                                    </Link>
                                </Card>
                            )) : <p className="text-muted-foreground col-span-full text-center py-8">No tienes amigos todavía. ¡Añade algunos desde el mercado!</p>}
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="chats">
                    <Card>
                        <CardHeader><CardTitle>Conversaciones</CardTitle></CardHeader>
                        <CardContent>
                           {chats.length > 0 ? (
                            <div className="space-y-2">
                               {chats.map(chat => chat.otherUser ? (
                                    <div key={chat.id} className="p-3 flex items-center justify-between hover:bg-muted rounded-md">
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={chat.otherUser.avatarUrl} data-ai-hint="person avatar"/>
                                                <AvatarFallback>{chat.otherUser.name.slice(0,2)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold">{chat.otherUser.name}</p>
                                                <p className="text-sm text-muted-foreground truncate max-w-xs">{chat.lastMessage?.content}</p>
                                            </div>
                                        </div>
                                         <p className="text-xs text-muted-foreground">{chat.lastMessageAt ? formatDistanceToNow(chat.lastMessageAt.toDate(), { addSuffix: true }) : ''}</p>
                                    </div>
                                ) : null)}
                           </div>
                           ) : <p className="text-muted-foreground text-center py-8">No tienes conversaciones. Envía un mensaje a un amigo para empezar.</p>}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="requests">
                    <Card>
                        <CardHeader><CardTitle>Solicitudes de Amistad</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                             {requests.length > 0 ? requests.map(req => req.fromUser ? (
                                <div key={req.id} className="p-3 flex items-center justify-between hover:bg-muted rounded-md border">
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarImage src={req.fromUser.avatarUrl} data-ai-hint="person avatar"/>
                                            <AvatarFallback>{req.fromUser.name.slice(0,2)}</AvatarFallback>
                                        </Avatar>
                                        <p><span className="font-semibold">{req.fromUser.name}</span> te ha enviado una solicitud.</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="icon" onClick={() => handleRequestResponse(req.id, true)}><Check className="h-4 w-4"/></Button>
                                        <Button size="icon" variant="destructive" onClick={() => handleRequestResponse(req.id, false)}><X className="h-4 w-4"/></Button>
                                    </div>
                                </div>
                             ) : null) : <p className="text-muted-foreground text-center py-8">No tienes solicitudes pendientes.</p>}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
