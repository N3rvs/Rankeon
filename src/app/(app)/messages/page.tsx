'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase/client";
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, doc, updateDoc, Timestamp } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { MoreVertical, Search, Send, MessageSquare } from "lucide-react";
import type { Conversation, Message, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function MessagesPage() {
    const { user, userProfile } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessageText, setNewMessageText] = useState('');
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (user) {
            const q = query(collection(db, 'conversations'), where('participantIds', 'array-contains', user.uid));
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const convos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
                convos.sort((a, b) => {
                    const timeA = a.lastMessage?.timestamp?.toMillis() || 0;
                    const timeB = b.lastMessage?.timestamp?.toMillis() || 0;
                    return timeB - timeA;
                });
                setConversations(convos);
                setLoadingConversations(false);
            }, (error) => {
                console.error("Error fetching conversations:", error);
                setLoadingConversations(false);
            });
            return () => unsubscribe();
        }
    }, [user]);

    useEffect(() => {
        if (selectedConversation) {
            setLoadingMessages(true);
            const messagesRef = collection(db, 'conversations', selectedConversation.id, 'messages');
            const q = query(messagesRef, orderBy('timestamp', 'asc'));
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const msgs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) } as Message));
                setMessages(msgs);
                setLoadingMessages(false);
            }, (error) => {
                console.error(`Error fetching messages for conversation ${selectedConversation.id}:`, error);
                setLoadingMessages(false);
            });
            return () => unsubscribe();
        }
    }, [selectedConversation]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessageText.trim() || !selectedConversation || !user) return;

        const currentMessageText = newMessageText;
        setNewMessageText('');

        const messagesRef = collection(db, 'conversations', selectedConversation.id, 'messages');
        const conversationRef = doc(db, 'conversations', selectedConversation.id);

        try {
            await addDoc(messagesRef, {
                senderId: user.uid,
                text: currentMessageText,
                timestamp: serverTimestamp(),
            });
            await updateDoc(conversationRef, {
                lastMessage: {
                    text: currentMessageText,
                    senderId: user.uid,
                    timestamp: serverTimestamp(),
                }
            });
        } catch (error) {
            console.error("Error sending message: ", error);
        }
    };

    const getOtherParticipant = (convo: Conversation) => {
        if (!user || !convo.participants) return null;
        const otherId = convo.participantIds.find(id => id !== user.uid);
        return otherId ? convo.participants[otherId] : null;
    };

    const otherParticipant = selectedConversation ? getOtherParticipant(selectedConversation) : null;

    return (
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
                        {loadingConversations ? (
                            <div className="p-4 space-y-4">
                                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                            </div>
                        ) : conversations.length === 0 ? (
                             <div className="flex flex-col items-center justify-center h-full text-center p-4">
                                <MessageSquare className="h-12 w-12 text-muted-foreground" />
                                <p className="mt-4 font-semibold">No conversations yet</p>
                                <p className="text-sm text-muted-foreground">Start a conversation from the market page.</p>
                            </div>
                        ) : (
                            conversations.map(convo => {
                                const other = getOtherParticipant(convo);
                                return (
                                    <div key={convo.id}
                                        onClick={() => setSelectedConversation(convo)}
                                        className={cn(
                                            "flex items-center gap-4 p-4 hover:bg-accent cursor-pointer border-b",
                                            selectedConversation?.id === convo.id && "bg-accent"
                                        )}>
                                        <Avatar>
                                            <AvatarImage src={other?.avatarUrl} data-ai-hint="person avatar" />
                                            <AvatarFallback>{other?.name?.slice(0, 2)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="font-semibold truncate">{other?.name}</p>
                                            <p className="text-sm text-muted-foreground truncate">{convo.lastMessage?.text}</p>
                                        </div>
                                        {convo.lastMessage?.timestamp && (
                                            <p className="text-xs text-muted-foreground shrink-0">
                                                {formatDistanceToNow(convo.lastMessage.timestamp.toDate(), { addSuffix: true })}
                                            </p>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </ScrollArea>
                </div>

                <div className="w-full md:w-2/3 flex flex-col">
                    {selectedConversation && otherParticipant ? (
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
                                <Button variant="ghost" size="icon"><MoreVertical /></Button>
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
                                            <ChatMessage key={msg.id} message={msg} currentUser={userProfile} otherUser={otherParticipant} />
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
    )
}

function ChatMessage({ message, message, currentUser, otherUser }: { message: Message, currentUser: UserProfile | null, otherUser: {name: string, avatarUrl: string} | null }) {
    const isMe = message.senderId === currentUser?.id;
    const participant = isMe ? currentUser : otherUser;
    
    return (
        <div className={cn("flex items-end gap-2", isMe ? "justify-end" : "justify-start")}>
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
                <p className="text-sm">{message.text}</p>
            </div>
            {isMe && (
                <Avatar className="h-8 w-8">
                    <AvatarImage src={participant?.avatarUrl} data-ai-hint="male avatar" />
                    <AvatarFallback>{participant?.name?.slice(0, 2)}</AvatarFallback>
                </Avatar>
            )}
        </div>
    );
}
