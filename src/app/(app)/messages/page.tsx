'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase/client";
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { MoreVertical, Search, Send, MessageSquare, Trash2, UserX, ShieldAlert, X } from "lucide-react";
import type { Chat, ChatMessage, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteMessage, sendMessageToFriend as sendMessageAction } from '@/lib/actions/messages';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { blockUser, removeFriend } from '@/lib/actions/friends';

export default function MessagesPage() {
    const { user, userProfile } = useAuth();
    const [chats, setChats] = useState<Chat[]>([]);
    const [participantProfiles, setParticipantProfiles] = useState<{ [id: string]: UserProfile }>({});
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessageText, setNewMessageText] = useState('');
    const [loadingChats, setLoadingChats] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    const [isRemoveFriendAlertOpen, setIsRemoveFriendAlertOpen] = useState(false);
    const [isBlockUserAlertOpen, setIsBlockUserAlertOpen] = useState(false);
    const [isPending, startTransition] = useTransition();


    useEffect(() => {
        if (!user) {
            setLoadingChats(false);
            setChats([]);
            return;
        }

        setLoadingChats(true);
        const q = query(collection(db, 'chats'), where('members', 'array-contains', user.uid));
        
        const unsubscribe = onSnapshot(q, async (querySnapshot) => {
            const chatData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
            chatData.sort((a, b) => {
                const timeA = a.lastMessage?.createdAt?.toMillis() || a.createdAt?.toMillis() || 0;
                const timeB = b.lastMessage?.createdAt?.toMillis() || b.createdAt?.toMillis() || 0;
                return timeB - timeA;
            });
            setChats(chatData);

            // Fetch participant profiles
            const profilesToFetch = new Set<string>();
            chatData.forEach(chat => {
                chat.members.forEach(memberId => {
                    if (memberId !== user.uid && !participantProfiles[memberId]) {
                        profilesToFetch.add(memberId);
                    }
                });
            });

            if (profilesToFetch.size > 0) {
                const newProfiles: { [id: string]: UserProfile } = {};
                for (const profileId of Array.from(profilesToFetch)) {
                    const userDoc = await getDoc(doc(db, "users", profileId));
                    if (userDoc.exists()) {
                        newProfiles[profileId] = { id: userDoc.id, ...userDoc.data() } as UserProfile;
                    }
                }
                setParticipantProfiles(prev => ({...prev, ...newProfiles}));
            }
            
            setLoadingChats(false);
        }, (error) => {
            console.error("Error fetching chats:", error);
            setLoadingChats(false);
        });

        return () => unsubscribe();
    }, [user, participantProfiles]);

    useEffect(() => {
        if (!selectedChat || !user) {
            setMessages([]);
            return;
        }

        setLoadingMessages(true);
        const messagesRef = collection(db, 'chats', selectedChat.id, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'asc'));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const msgs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) } as ChatMessage));
            setMessages(msgs);
            setLoadingMessages(false);
        }, (error) => {
            console.error(`Error fetching messages for chat ${selectedChat.id}:`, error);
            setLoadingMessages(false);
        });
        
        return () => unsubscribe();
    }, [selectedChat, user]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const getOtherParticipant = (chat: Chat) => {
        if (!user) return null;
        const otherId = chat.members.find(id => id !== user.uid);
        return otherId ? participantProfiles[otherId] : null;
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const other = selectedChat ? getOtherParticipant(selectedChat) : null;
        if (!newMessageText.trim() || !selectedChat || !user || !other) return;

        const currentMessageText = newMessageText;
        setNewMessageText('');
        
        try {
            await sendMessageAction({ to: other.id, content: currentMessageText });
        } catch (error) {
            console.error("Error sending message: ", error);
            // Re-set text on failure
            setNewMessageText(currentMessageText);
        }
    };

    const otherParticipant = selectedChat ? getOtherParticipant(selectedChat) : null;

     const handleRemoveFriend = () => {
        if (!selectedChat || !otherParticipant) return;
        startTransition(async () => {
            const result = await removeFriend(otherParticipant.id);
            if (result.success) {
                toast({ title: "Friend Removed", description: `You are no longer friends with ${otherParticipant.name}.` });
                setSelectedChat(null); // Close the chat window
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
            setIsRemoveFriendAlertOpen(false);
        });
    };

    const handleBlockUser = () => {
        if (!selectedChat || !otherParticipant) return;
        startTransition(async () => {
            const result = await blockUser(otherParticipant.id);
            if (result.success) {
                toast({ title: "User Blocked", description: `You have blocked ${otherParticipant.name}.` });
                setSelectedChat(null); // Close the chat window
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
            setIsBlockUserAlertOpen(false);
        });
    };

    return (
        <>
            <AlertDialog open={isRemoveFriendAlertOpen} onOpenChange={setIsRemoveFriendAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove {otherParticipant?.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove this user as a friend? You will no longer be able to message them.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRemoveFriend} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {isPending ? "Removing..." : "Remove Friend"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={isBlockUserAlertOpen} onOpenChange={setIsBlockUserAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Block {otherParticipant?.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                           Blocking this user will also remove them as a friend. You won't be able to see their messages or profiles, and they won't be able to contact you. This action is reversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBlockUser} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {isPending ? "Blocking..." : "Block User"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="h-[calc(100vh-theme(spacing.24))]">
                <Card className="h-full flex">
                    <div className="w-full md:w-1/3 border-r flex-col hidden md:flex">
                        <div className="p-4 border-b">
                            <h2 className="text-2xl font-bold font-headline">Messages</h2>
                            <div className="relative mt-2">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search messages..." className="pl-9" />
                            </div>
                        </div>
                        <ScrollArea className="flex-1">
                            {loadingChats ? (
                                <div className="p-4 space-y-4">
                                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                                </div>
                            ) : chats.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                                    <MessageSquare className="h-12 w-12 text-muted-foreground" />
                                    <p className="mt-4 font-semibold">No conversations yet</p>
                                    <p className="text-sm text-muted-foreground">Start a conversation from the market page.</p>
                                </div>
                            ) : (
                                chats.map(chat => {
                                    const other = getOtherParticipant(chat);
                                    if (!other) return <Skeleton key={chat.id} className="h-16 w-full p-4" />;
                                    return (
                                        <div key={chat.id}
                                            onClick={() => setSelectedChat(chat)}
                                            className={cn(
                                                "flex items-center gap-4 p-4 hover:bg-accent cursor-pointer border-b",
                                                selectedChat?.id === chat.id && "bg-accent"
                                            )}>
                                            <Avatar>
                                                <AvatarImage src={other?.avatarUrl} data-ai-hint="person avatar" />
                                                <AvatarFallback>{other?.name?.slice(0, 2)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 overflow-hidden">
                                                <p className="font-semibold truncate">{other?.name}</p>
                                                <p className="text-sm text-muted-foreground truncate">{chat.lastMessage?.content}</p>
                                            </div>
                                            {chat.lastMessage?.createdAt && (
                                                <p className="text-xs text-muted-foreground shrink-0">
                                                    {formatDistanceToNow(chat.lastMessage.createdAt.toDate(), { addSuffix: true })}
                                                </p>
                                            )}
                                        </div>
                                    )
                                })
                            )}
                        </ScrollArea>
                    </div>

                    <div className="w-full md:w-2/3 flex flex-col">
                        {selectedChat && otherParticipant ? (
                            <>
                                <div className="p-4 border-b flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <Avatar>
                                            <AvatarImage src={otherParticipant.avatarUrl} data-ai-hint="person avatar" />
                                            <AvatarFallback>{otherParticipant.name.slice(0, 2)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold">{otherParticipant.name}</p>
                                            <p className="text-sm text-muted-foreground">Online</p>
                                        </div>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon"><MoreVertical /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                             <DropdownMenuItem onSelect={() => setSelectedChat(null)}>
                                                <X className="mr-2 h-4 w-4" />
                                                <span>Close Chat</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onSelect={() => setIsRemoveFriendAlertOpen(true)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                <UserX className="mr-2 h-4 w-4" />
                                                <span>Remove Friend</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => setIsBlockUserAlertOpen(true)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                <ShieldAlert className="mr-2 h-4 w-4" />
                                                <span>Block User</span>
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
                                        ) : (
                                            messages.map(msg => (
                                                <ChatMessageDisplay key={msg.id} message={msg} currentUser={userProfile} otherUser={otherParticipant} chatId={selectedChat.id} />
                                            ))
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>
                                </ScrollArea>
                                <div className="p-4 border-t mt-auto">
                                    <form onSubmit={handleSendMessage} className="relative">
                                        <Input
                                            placeholder="Type a message..."
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
                                <MessageSquare className="h-16 w-16 text-muted-foreground" />
                                <h3 className="mt-4 text-xl font-semibold">Select a conversation</h3>
                                <p className="text-muted-foreground">Choose one of your existing conversations to see the messages.</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </>
    )
}

function ChatMessageDisplay({ message, currentUser, otherUser, chatId }: { message: ChatMessage, currentUser: UserProfile | null, otherUser: UserProfile | null, chatId: string }) {
    const isMe = message.sender === currentUser?.id;
    const participant = isMe ? currentUser : otherUser;
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const handleDelete = () => {
        startTransition(async () => {
            const result = await deleteMessage({ chatId, messageId: message.id });
            if (!result.success) {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
            // No success toast needed, the change is reflected instantly.
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
                {!isMe && (
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={participant?.avatarUrl} data-ai-hint="person avatar" />
                        <AvatarFallback>{participant?.name?.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                )}
                <div className={cn(
                    "max-w-xs md:max-w-md rounded-lg p-3",
                    isMe ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                    <p className="text-sm">{message.content}</p>
                </div>
                {isMe && (
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={participant?.avatarUrl} data-ai-hint="male avatar" />
                        <AvatarFallback>{participant?.name?.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                )}
            </div>
        </>
    );
}
