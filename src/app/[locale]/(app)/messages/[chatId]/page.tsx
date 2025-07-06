
'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase/client';
import { collection, query, orderBy, onSnapshot, Unsubscribe, doc, getDoc, where, getDocs } from 'firebase/firestore';
import type { ChatMessage, UserProfile } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { sendMessageToFriend, deleteChatHistory } from '@/lib/actions/messages';
import { blockUser, removeFriend } from '@/lib/actions/friends';
import { markNotificationsAsRead } from '@/lib/actions/notifications';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useParams, useRouter } from 'next/navigation';
import { Send, ArrowLeft, UserCircle, ShieldBan, Trash2, UserX, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function ChatHeader({
  recipient,
  onBlock,
  onDeleteHistory,
  onRemoveFriend,
  locale,
}: {
  recipient: UserProfile | null;
  onBlock: () => void;
  onDeleteHistory: () => void;
  onRemoveFriend: () => void;
  locale?: string;
}) {
  if (!recipient) {
    return (
      <div className="p-4 border-b flex items-center justify-between h-16">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-6 w-32" />
        </div>
      </div>
    );
  }

  const profileLink = locale ? `/${locale}/users/${recipient.id}` : `/users/${recipient.id}`;
  const messagesLink = locale ? `/${locale}/messages` : '/messages';

  return (
    <div className="p-4 border-b flex items-center justify-between gap-4 h-16">
        <div className="flex items-center gap-4 flex-1 overflow-hidden">
             <Button variant="ghost" size="icon" className="md:hidden flex-shrink-0" asChild>
                <Link href={messagesLink}>
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            
            <Link href={profileLink} className="flex-1 flex items-center gap-4 overflow-hidden rounded-md p-2 -m-2 hover:bg-muted">
                <Avatar className="flex-shrink-0">
                    <AvatarImage src={recipient.avatarUrl} data-ai-hint="person avatar" />
                    <AvatarFallback>{recipient.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <h2 className="text-lg font-semibold truncate">{recipient.name}</h2>
            </Link>
        </div>
        
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5" />
                    <span className="sr-only">Chat Actions</span>
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                    <Link href={profileLink}>
                        <UserCircle className="mr-2 h-4 w-4" />
                        Ver Perfil
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onRemoveFriend} className="text-destructive focus:text-destructive">
                    <UserX className="mr-2 h-4 w-4" />
                    Eliminar Amigo
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onBlock} className="text-destructive focus:text-destructive">
                    <ShieldBan className="mr-2 h-4 w-4" />
                    Bloquear Usuario
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onDeleteHistory} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar Historial
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    </div>
  );
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
    const router = useRouter();
    const chatId = params.chatId as string;
    const locale = params.locale as string | undefined;
    
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [recipient, setRecipient] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    const [isBlockAlertOpen, setIsBlockAlertOpen] = useState(false);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [isRemoveFriendAlertOpen, setIsRemoveFriendAlertOpen] = useState(false);

    useEffect(() => {
        if (!chatId || !user) return;

        const markAsRead = async () => {
            const notificationsRef = collection(db, 'inbox', user.uid, 'notifications');
            const q = query(
                notificationsRef, 
                where('chatId', '==', chatId), 
                where('read', '==', false),
                where('type', '==', 'new_message')
            );
            
            try {
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    const unreadIds = snapshot.docs.map(doc => doc.id);
                    await markNotificationsAsRead(unreadIds);
                }
            } catch (error) {
                console.error("Failed to mark chat as read:", error);
            }
        };
    
        markAsRead();
    }, [chatId, user]);


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

    const handleBlockUser = () => {
        if (!recipient) return;
        startTransition(async () => {
            const result = await blockUser(recipient.id);
            if (result.success) {
                toast({ title: 'Usuario Bloqueado', description: `${recipient.name} ha sido bloqueado. No podrás enviarle mensajes.` });
                router.push(locale ? `/${locale}/messages` : '/messages');
            } else {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            }
            setIsBlockAlertOpen(false);
        });
    }

    const handleRemoveFriend = () => {
        if (!recipient) return;
        startTransition(async () => {
            const result = await removeFriend(recipient.id);
            if (result.success) {
                toast({ title: 'Amigo Eliminado', description: `${recipient.name} ya no es tu amigo.` });
                router.push(locale ? `/${locale}/messages` : '/messages');
            } else {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            }
            setIsRemoveFriendAlertOpen(false);
        });
    }

    const handleDeleteHistory = () => {
        if (!chatId) return;
        startTransition(async () => {
            const result = await deleteChatHistory({ chatId });
            if (result.success) {
                toast({ title: 'Historial Eliminado', description: 'El historial de este chat ha sido eliminado para ambos.' });
            } else {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            }
            setIsDeleteAlertOpen(false);
        });
    }

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
        <>
            <AlertDialog open={isBlockAlertOpen} onOpenChange={setIsBlockAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Bloquear a {recipient?.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción es irreversible. No podrás enviar ni recibir mensajes de este usuario y será eliminado de tu lista de amigos.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBlockUser} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {isPending ? 'Bloqueando...' : 'Sí, bloquear'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar historial del chat?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará permanentemente todos los mensajes de esta conversación para ambos participantes. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteHistory} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {isPending ? 'Eliminando...' : 'Sí, eliminar'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <AlertDialog open={isRemoveFriendAlertOpen} onOpenChange={setIsRemoveFriendAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar a {recipient?.name} de tus amigos?</AlertDialogTitle>
                        <AlertDialogDescription>
                           Esta acción eliminará a este usuario de tu lista de amigos y el historial de chat se borrará permanentemente. Para volver a chatear, tendrás que enviar una nueva solicitud de amistad.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRemoveFriend} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {isPending ? 'Eliminando...' : 'Sí, eliminar amigo'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="flex flex-col h-full">
                <ChatHeader 
                    recipient={recipient} 
                    onBlock={() => setIsBlockAlertOpen(true)}
                    onDeleteHistory={() => setIsDeleteAlertOpen(true)}
                    onRemoveFriend={() => setIsRemoveFriendAlertOpen(true)}
                    locale={locale}
                />
                <ChatMessages messages={messages} recipient={recipient} currentUserProfile={userProfile} />
                {recipient && <ChatInput recipientId={recipient.id} onSend={handleSendMessage} />}
            </div>
        </>
    );
}
