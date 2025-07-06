'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase/client';
import { collection, query, orderBy, onSnapshot, Unsubscribe, doc, getDoc } from 'firebase/firestore';
import type { ChatMessage, UserProfile } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { sendMessageToFriend } from '@/lib/actions/messages';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useParams } from 'next/navigation';
import { Send, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function ChatHeader({ recipient }: { recipient: UserProfile | null }) {
     if (!recipient) {
        return (
             <div className="p-4 border-b flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-6 w-32" />
            </div>
        )
    }
    return (
        <div className="p-4 border-b flex items-center gap-4">
             <Button variant="ghost" size="icon" className="md:hidden" asChild>
                <Link href="/messages">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            <Avatar>
                <AvatarImage src={recipient.avatarUrl} data-ai-hint="person avatar"/>
                <AvatarFallback>{recipient.name.slice(0,2)}</AvatarFallback>
            </Avatar>
            <h2 className="text-lg font-semibold">{recipient.name}</h2>
        </div>
    )
}

function ChatMessages({ messages, recipient, currentUserProfile }: { messages: ChatMessage[], recipient: UserProfile | null, currentUserProfile: UserProfile | null }) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

     useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, [messages]);

    return (
         <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((msg) => {
                const isMe = msg.sender === currentUserProfile?.id;
                const senderProfile = isMe ? currentUserProfile : recipient;
                
                if (!senderProfile) return null;

                return (
                  <div key={msg.id} className={cn('flex items-end gap-2', isMe ? 'justify-end' : 'justify-start')}>
                    {!isMe && (
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={senderProfile.avatarUrl} data-ai-hint="person avatar"/>
                          <AvatarFallback>{senderProfile.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                    )}
                     <div className={cn(
                        'rounded-lg px-3 py-2 text-sm max-w-xs md:max-w-md break-words',
                        isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'
                     )}>
                        {msg.content}
                    </div>
                    {isMe && (
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={senderProfile.avatarUrl} data-ai-hint="person avatar"/>
                          <AvatarFallback>{senderProfile.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                    )}
                  </div>
                );
              })
            }
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
    )
}

function ChatInput({ recipientId, onSend }: { recipientId: string, onSend: (content: string) => Promise<void>}) {
    const [newMessage, setNewMessage] = useState('');
    const [isPending, startTransition] = useTransition();

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !recipientId) return;

        const currentMessage = newMessage;
        setNewMessage('');

        startTransition(async () => {
            await onSend(currentMessage);
        });
    };

    return (
        <div className="p-4 border-t">
          <form onSubmit={handleSendMessage} className="relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="pr-12"
              disabled={isPending}
            />
            <Button
              type="submit"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
              disabled={!newMessage.trim() || isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
    )
}


export default function ChatPage() {
    const { user, userProfile, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const params = useParams();
    const chatId = params.chatId as string;
    
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [recipient, setRecipient] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!chatId || !user) {
            setLoading(false);
            return;
        };

        setLoading(true);

        const memberIds = chatId.split('_');
        const recipientId = memberIds.find(id => id !== user.uid);

        if (!recipientId) {
            setLoading(false);
            return;
        }

        const fetchRecipient = async () => {
             const userDoc = await getDoc(doc(db, 'users', recipientId));
             if (userDoc.exists()) {
                 setRecipient({id: userDoc.id, ...userDoc.data()} as UserProfile);
             }
        }
        fetchRecipient();

        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
                const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
                setMessages(msgs);
                setLoading(false);
            }, (error) => {
                console.error('Error fetching chat messages:', error);
                setLoading(false);
            });

        return () => unsubscribe();
    }, [chatId, user]);

     const handleSendMessage = async (content: string) => {
        if (!recipient) return;
        const result = await sendMessageToFriend({ to: recipient.id, content });
        if (!result.success) {
            toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
    };

    if (loading || authLoading) {
        return (
            <div className="flex flex-col h-full">
                <div className="p-4 border-b flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-6 w-32" />
                </div>
                <div className="flex-1 p-4 space-y-4">
                    <Skeleton className="h-10 w-2/3" />
                    <Skeleton className="h-10 w-1/2 ml-auto" />
                    <Skeleton className="h-10 w-3/4" />
                </div>
                 <div className="p-4 border-t">
                    <Skeleton className="h-10 w-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <ChatHeader recipient={recipient} />
            <ChatMessages messages={messages} recipient={recipient} currentUserProfile={userProfile} />
            {recipient && <ChatInput recipientId={recipient.id} onSend={handleSendMessage} />}
        </div>
    );
}
