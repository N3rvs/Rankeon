
'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase/client";
import { collection, query, onSnapshot, orderBy, doc, getDocs, Unsubscribe } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { MoreVertical, Search, Send, Users, Trash2, UserX, ShieldAlert, X, BookX } from "lucide-react";
import type { Chat, ChatMessage, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteChatHistory, deleteMessage, sendMessageToFriend } from '@/lib/actions/messages';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { blockUser, removeFriend } from '@/lib/actions/friends';

export default function MessagesPage() {
    const { user, userProfile } = useAuth();
    const [friends, setFriends] = useState<UserProfile[]>([]);
    const [friendChats, setFriendChats] = useState<{ [friendId: string]: Chat | null }>({});
    const [selectedFriend, setSelectedFriend] = useState<UserProfile | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessageText, setNewMessageText] = useState('');
    const [loadingFriends, setLoadingFriends] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    const [isRemoveFriendAlertOpen, setIsRemoveFriendAlertOpen] = useState(false);
    const [isBlockUserAlertOpen, setIsBlockUserAlertOpen] = useState(false);
    const [isDeleteHistoryAlertOpen, setIsDeleteHistoryAlertOpen] = useState(false);
    const [isPending, startTransition] = useTransition();


    // Effect to load friends and listen to their chat states
    useEffect(() => {
        let chatUnsubscribes: Unsubscribe[] = [];

        const fetchFriendsAndChats = async () => {
            if (!user || !userProfile?.friends || userProfile.friends.length === 0) {
                setFriends([]);
                setFriendChats({});
                setLoadingFriends(false);
                return;
            }

            setLoadingFriends(true);
            const friendIds = userProfile.friends;
            
            // 1. Fetch all friend profiles
            try {
                const friendDocs = await Promise.all(friendIds.map(id => getDoc(doc(db, 'users', id))));
                const friendProfiles = friendDocs
                    .filter(docSnap => docSnap.exists())
                    .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as UserProfile));
                setFriends(friendProfiles);

                // 2. Listen to all relevant chat documents for real-time updates
                chatUnsubscribes = friendIds.map(friendId => {
                    const chatId = [user.uid, friendId].sort().join('_');
                    const chatRef = doc(db, 'chats', chatId);
                    return onSnapshot(chatRef, (chatDoc) => {
                        setFriendChats(prev => ({
                            ...prev,
                            [friendId]: chatDoc.exists() ? ({ id: chatDoc.id, ...chatDoc.data() } as Chat) : null
                        }));
                    });
                });
            } catch (error) {
                console.error("Error fetching friends:", error);
            } finally {
                setLoadingFriends(false);
            }
        };

        fetchFriendsAndChats();

        return () => {
            chatUnsubscribes.forEach(unsub => unsub());
        };
    }, [user, userProfile?.friends?.join(',')]); // Depend on joined string of friends to refetch if friends change

    // Sort friends by last message time
    const sortedFriends = [...friends].sort((a, b) => {
        const timeA = friendChats[a.id]?.lastMessageAt?.toMillis() || 0;
        const timeB = friendChats[b.id]?.lastMessageAt?.toMillis() || 0;
        return timeB - timeA;
    });

    // Effect to load messages for the selected chat
    useEffect(() => {
        let unsubscribe: Unsubscribe | undefined;
        if (selectedFriend && user) {
            setLoadingMessages(true);
            const chatId = [user.uid, selectedFriend.id].sort().join('_');
            const messagesRef = collection(db, 'chats', chatId, 'messages');
            const q = query(messagesRef, orderBy('createdAt', 'asc'));
            
            unsubscribe = onSnapshot(q, (querySnapshot) => {
                const msgs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) } as ChatMessage));
                setMessages(msgs);
                setLoadingMessages(false);
            }, (error) => {
                console.error(`Error fetching messages for chat with ${selectedFriend.name}:`, error);
                setLoadingMessages(false);
            });
        } else {
          setMessages([]);
        }
        
        return () => unsubscribe?.();
    }, [selectedFriend, user]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessageText.trim() || !selectedFriend || !user) return;

        const currentMessageText = newMessageText;
        setNewMessageText('');
        
        const result = await sendMessageToFriend({ to: selectedFriend.id, content: currentMessageText });
        
        if (!result.success) {
            console.error("Error sending message: ", result.message);
            toast({ title: "Error", description: result.message, variant: "destructive" });
            setNewMessageText(currentMessageText);
        }
    };

    const handleRemoveFriend = () => {
        if (!selectedFriend) return;
        const friendToRemove = selectedFriend;
        startTransition(async () => {
            const result = await removeFriend(friendToRemove.id);
            if (result.success) {
                toast({ title: "Amigo Eliminado", description: `Ya no eres amigo de ${friendToRemove.name}.` });
                setSelectedFriend(null);
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
            setIsRemoveFriendAlertOpen(false);
        });
    };

    const handleBlockUser = () => {
        if (!selectedFriend) return;
        const friendToBlock = selectedFriend;
        startTransition(async () => {
            const result = await blockUser(friendToBlock.id);
            if (result.success) {
                toast({ title: "Usuario Bloqueado", description: `Has bloqueado a ${friendToBlock.name}.` });
                setSelectedFriend(null);
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
            setIsBlockUserAlertOpen(false);
        });
    };

    const handleDeleteChatHistory = () => {
        if (!selectedFriend || !user) return;
        const chatId = [user.uid, selectedFriend.id].sort().join('_');
        startTransition(async () => {
            const result = await deleteChatHistory({ chatId });
            if (result.success) {
                toast({ title: "Historial Borrado", description: `Todos los mensajes con ${selectedFriend.name} han sido eliminados.` });
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
            setIsDeleteHistoryAlertOpen(false);
        });
    };

    return (
        <>
            <AlertDialog open={isRemoveFriendAlertOpen} onOpenChange={setIsRemoveFriendAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar a {selectedFriend?.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Estás seguro de que quieres eliminar a este usuario como amigo? Ya no podrás enviarle mensajes.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRemoveFriend} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {isPending ? "Eliminando..." : "Eliminar Amigo"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={isBlockUserAlertOpen} onOpenChange={setIsBlockUserAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Bloquear a {selectedFriend?.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                           Bloquear a este usuario también lo eliminará como amigo. No podrás ver sus mensajes o perfiles, y no podrán contactarte. Esta acción es reversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBlockUser} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {isPending ? "Bloqueando..." : "Bloquear Usuario"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
             <AlertDialog open={isDeleteHistoryAlertOpen} onOpenChange={setIsDeleteHistoryAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Borrar todos los mensajes con {selectedFriend?.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                           Esto eliminará permanentemente todo el historial de la conversación para todos. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteChatHistory} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {isPending ? "Borrando..." : "Borrar Historial"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="h-[calc(100vh-theme(spacing.24))]">
                <Card className="h-full flex">
                    <div className="w-full md:w-1/3 border-r flex-col hidden md:flex">
                        <div className="p-4 border-b">
                            <h2 className="text-2xl font-bold font-headline">Amigos</h2>
                            <div className="relative mt-2">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Buscar amigos..." className="pl-9" />
                            </div>
                        </div>
                        <ScrollArea className="flex-1">
                            {loadingFriends ? (
                                <div className="p-4 space-y-4">
                                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                                </div>
                            ) : sortedFriends.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                                    <Users className="h-12 w-12 text-muted-foreground" />
                                    <p className="mt-4 font-semibold">No tienes amigos todavía</p>
                                    <p className="text-sm text-muted-foreground">Encuentra y agrega amigos desde el mercado.</p>
                                </div>
                            ) : (
                                sortedFriends.map(friend => {
                                    const chat = friendChats[friend.id];
                                    return (
                                        <div key={friend.id}
                                            onClick={() => setSelectedFriend(friend)}
                                            className={cn(
                                                "flex items-center gap-4 p-4 hover:bg-accent cursor-pointer border-b",
                                                selectedFriend?.id === friend.id && "bg-accent"
                                            )}>
                                            <Avatar>
                                                <AvatarImage src={friend?.avatarUrl} data-ai-hint="person avatar" />
                                                <AvatarFallback>{friend?.name?.slice(0, 2)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 overflow-hidden">
                                                <p className="font-semibold truncate">{friend?.name}</p>
                                                <p className="text-sm text-muted-foreground truncate">{chat?.lastMessage?.content || "No hay mensajes todavía."}</p>
                                            </div>
                                            {chat?.lastMessageAt && (
                                                <p className="text-xs text-muted-foreground shrink-0">
                                                    {formatDistanceToNow(chat.lastMessageAt.toDate(), { addSuffix: true })}
                                                </p>
                                            )}
                                        </div>
                                    )
                                })
                            )}
                        </ScrollArea>
                    </div>

                    <div className="w-full md:w-2/3 flex flex-col">
                        {selectedFriend ? (
                            <>
                                <div className="p-4 border-b flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <Avatar>
                                            <AvatarImage src={selectedFriend.avatarUrl} data-ai-hint="person avatar" />
                                            <AvatarFallback>{selectedFriend.name.slice(0, 2)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold">{selectedFriend.name}</p>
                                            <p className="text-sm text-muted-foreground">Online</p>
                                        </div>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon"><MoreVertical /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                             <DropdownMenuItem onSelect={() => setSelectedFriend(null)}>
                                                <X className="mr-2 h-4 w-4" />
                                                <span>Cerrar Chat</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onSelect={() => setIsDeleteHistoryAlertOpen(true)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                <BookX className="mr-2 h-4 w-4" />
                                                <span>Borrar Historial</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => setIsRemoveFriendAlertOpen(true)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                <UserX className="mr-2 h-4 w-4" />
                                                <span>Eliminar Amigo</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => setIsBlockUserAlertOpen(true)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                <ShieldAlert className="mr-2 h-4 w-4" />
                                                <span>Bloquear Usuario</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <ScrollArea className="flex-1 p-6">
                                    <div className="space-y-6">
                                        {loadingMessages ? (
                                            <div className="space-y-6">
                                                <Skeleton className="h-10 w-2/3" />
                                                <Skeleton className="h-10 w-1/2 ml-auto" />
                                                <Skeleton className="h-10 w-3/4" />
                                            </div>
                                        ) : messages.length > 0 ? (
                                            messages.map(msg => (
                                                <ChatMessageDisplay key={msg.id} message={msg} currentUser={userProfile} otherParticipant={selectedFriend} chatId={[user!.uid, selectedFriend.id].sort().join('_')} />
                                            ))
                                        ) : (
                                          <div className="flex flex-col items-center justify-center h-full text-center p-4 text-muted-foreground">
                                             <Send className="h-12 w-12 mb-4" />
                                             <p className="font-semibold">Empieza la conversación</p>
                                             <p className="text-sm">Envía el primer mensaje a {selectedFriend.name}.</p>
                                          </div>
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>
                                </ScrollArea>
                                <div className="p-4 border-t mt-auto">
                                    <form onSubmit={handleSendMessage} className="relative">
                                        <Input
                                            placeholder="Escribe un mensaje..."
                                            className="pr-12"
                                            value={newMessageText}
                                            onChange={(e) => setNewMessageText(e.target.value)}
                                        />
                                        <Button type="submit" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8">
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center p-4">
                                <Users className="h-16 w-16 text-muted-foreground" />
                                <h3 className="mt-4 text-xl font-semibold">Selecciona un amigo</h3>
                                <p className="text-muted-foreground">Elige a un amigo de tu lista para ver la conversación.</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </>
    )
}

function ChatMessageDisplay({ message, currentUser, otherParticipant, chatId }: { message: ChatMessage, currentUser: UserProfile | null, otherParticipant: UserProfile | null, chatId: string }) {
    const isMe = message.sender === currentUser?.id;
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const handleDelete = () => {
        startTransition(async () => {
            const result = await deleteMessage({ chatId, messageId: message.id });
            if (!result.success) {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
            setIsAlertOpen(false);
        });
    };
    
    return (
        <>
            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this message. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {isPending ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <div className={cn("group flex items-end gap-2", isMe ? "justify-end" : "justify-start")}>
                {isMe && (
                     <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => setIsAlertOpen(true)}
                        disabled={isPending}
                    >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete message</span>
                    </Button>
                )}
                {!isMe && otherParticipant && (
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={otherParticipant.avatarUrl} data-ai-hint="person avatar" />
                        <AvatarFallback>{otherParticipant.name?.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                )}
                <div className={cn(
                    "max-w-xs md:max-w-md rounded-lg p-3",
                    isMe ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                    <p className="text-sm">{message.content}</p>
                </div>
                {isMe && currentUser && (
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={currentUser.avatarUrl} data-ai-hint="male avatar" />
                        <AvatarFallback>{currentUser.name?.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                )}
            </div>
        </>
    );
}
