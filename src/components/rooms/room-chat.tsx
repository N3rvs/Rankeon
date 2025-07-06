'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase/client';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import type { ChatMessage, UserProfile } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { sendMessageToRoom } from '@/lib/actions/rooms';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface RoomChatProps {
  roomId: string;
  participants: UserProfile[];
}

export function RoomChat({ roomId, participants }: RoomChatProps) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const participantsMap = new Map(participants.map((p) => [p.id, p]));

  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;
    setLoading(true);
    const messagesRef = collection(db, 'gameRooms', roomId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as ChatMessage)
        );
        setMessages(msgs);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching room messages:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe?.();
  }, [roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const currentMessage = newMessage;
    setNewMessage('');

    const result = await sendMessageToRoom({
      roomId,
      content: currentMessage,
    });

    if (!result.success) {
      toast({
        title: 'Error',
        description: result.message,
        variant: 'destructive',
      });
      setNewMessage(currentMessage); // Restore message on failure
    }
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-theme(spacing.48))]">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <MessageSquare className="h-6 w-6" /> Sala de Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-2/3" />
                <Skeleton className="h-12 w-1/2 ml-auto" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">
                Sé el primero en enviar un mensaje.
              </div>
            ) : (
              messages.map((msg) => {
                const sender = participantsMap.get(msg.sender);
                const isMe = msg.sender === user?.uid;
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex items-end gap-2',
                      isMe ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {!isMe && sender && (
                      <>
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage
                            src={sender.avatarUrl}
                            data-ai-hint="person avatar"
                          />
                          <AvatarFallback>
                            {sender.name.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-1 items-start">
                          <span className="text-xs text-muted-foreground px-2">
                            {sender.name}
                          </span>
                          <div
                            className={cn(
                              'rounded-lg px-3 py-2 text-sm max-w-xs break-words',
                              'bg-muted'
                            )}
                          >
                            {msg.content}
                          </div>
                        </div>
                      </>
                    )}

                    {isMe && userProfile && (
                      <>
                        <div
                          className={cn(
                            'rounded-lg px-3 py-2 text-sm max-w-xs break-words',
                            'bg-primary text-primary-foreground'
                          )}
                        >
                          {msg.content}
                        </div>
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage
                            src={userProfile.avatarUrl}
                            data-ai-hint="person avatar"
                          />
                          <AvatarFallback>
                            {userProfile.name?.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                      </>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        <div className="p-4 border-t">
          <form onSubmit={handleSendMessage} className="relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="pr-12"
              disabled={!participants.some((p) => p.id === user?.uid)}
            />
            <Button
              type="submit"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
              disabled={
                !newMessage.trim() ||
                !participants.some((p) => p.id === user?.uid)
              }
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
