
// src/components/friends/chat-dialog.tsx
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { sendMessageToFriend, deleteChatHistory } from '@/lib/actions/messages';
import { blockUser, removeFriend } from '@/lib/actions/friends';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Send, UserCircle, ShieldBan, Trash2, UserX, MoreVertical, X } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useI18n } from '@/contexts/i18n-context';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '../ui/skeleton';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { FirestorePermissionError } from '@/lib/firebase/errors';

interface ChatDialogProps {
  recipient: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatDialog({ recipient, open, onOpenChange }: ChatDialogProps) {
  const { user, userProfile } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [isBlockAlertOpen, setIsBlockAlertOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isRemoveFriendAlertOpen, setIsRemoveFriendAlertOpen] = useState(false);
  
  const chatId = user && recipient ? [user.uid, recipient.id].sort().join('_') : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages]);

  useEffect(() => {
    if (!chatId || !open) {
      setMessages([]);
      setLoading(true);
      return;
    }

    setLoading(true);
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
      setMessages(msgs);
      setLoading(false);
    }, (error) => {
      const permissionError = new FirestorePermissionError({
        path: `chats/${chatId}/messages`,
        operation: 'list',
      });
      errorEmitter.emit('permission-error', permissionError);
      console.error("Original error in chat listener:", error);
      setMessages([]);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [chatId, open]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !recipient) return;

    const currentMessage = newMessage;
    setNewMessage('');
    audioRef.current?.play().catch(err => console.error("Audio play failed:", err));

    startTransition(async () => {
      const result = await sendMessageToFriend({ to: recipient.id, content: currentMessage });
      if (!result.success) {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
        setNewMessage(currentMessage);
      }
    });
  };
  
  const handleBlockUser = () => {
    if (!recipient) return;
    startTransition(async () => {
      await blockUser(recipient.id);
      toast({ title: t('MessagesPage.block_confirm_title', { name: recipient.name }) });
      onOpenChange(false);
    });
  };
  
  const handleRemoveFriend = () => {
    if (!recipient) return;
    startTransition(async () => {
      await removeFriend(recipient.id);
      toast({ title: t('MessagesPage.remove_friend_title', { name: recipient.name }) });
      onOpenChange(false);
    });
  };
  
  const handleDeleteHistory = () => {
    if (!chatId) return;
    startTransition(async () => {
      await deleteChatHistory({ chatId });
      toast({ title: t('MessagesPage.delete_history_title') });
      setIsDeleteAlertOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[90vw] h-[80vh] flex flex-col p-0">
        <audio ref={audioRef} src="https://actions.google.com/sounds/v1/communications/send_message.ogg" preload="auto" />
        {!recipient ? (
             <div className="flex items-center justify-center h-full"><Spinner /></div>
        ) : (
          <>
            <DialogHeader className="p-4 border-b flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={recipient.avatarUrl} data-ai-hint="person avatar" />
                        <AvatarFallback>{recipient.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                     <div>
                        <DialogTitle>{recipient.name}</DialogTitle>
                        <DialogDescription>
                            <Link href={`/users/${recipient.id}`} className="hover:underline text-xs">
                                {t('MessagesPage.view_profile')}
                            </Link>
                        </DialogDescription>
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreVertical className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setIsRemoveFriendAlertOpen(true)} className="text-destructive focus:text-destructive">
                            <UserX className="mr-2 h-4 w-4" /> {t('MessagesPage.remove_friend')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setIsBlockAlertOpen(true)} className="text-destructive focus:text-destructive">
                            <ShieldBan className="mr-2 h-4 w-4" /> {t('MessagesPage.block_user')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => setIsDeleteAlertOpen(true)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> {t('MessagesPage.delete_history')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                 <Button variant="ghost" size="icon" className="absolute top-3 right-3 md:hidden" onClick={() => onOpenChange(false)}>
                    <X className="h-4 w-4" />
                </Button>
            </DialogHeader>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {loading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-3/4 rounded-lg" />
                        <Skeleton className="h-10 w-2/4 rounded-lg ml-auto" />
                        <Skeleton className="h-8 w-3/5 rounded-lg" />
                    </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender === user?.uid;
                    const senderProfile = isMe ? userProfile : recipient;
                    
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
                            'rounded-lg px-3 py-2 text-sm max-w-[85%] break-words',
                            isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'
                         )}>
                            {msg.content}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <DialogFooter className="p-4 border-t">
              <form onSubmit={handleSendMessage} className="relative w-full">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={t('MessagesPage.type_message')}
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
            </DialogFooter>
          </>
        )}
      </DialogContent>

      <AlertDialog open={isBlockAlertOpen} onOpenChange={setIsBlockAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('MessagesPage.block_confirm_title', { name: recipient?.name })}</AlertDialogTitle>
            <AlertDialogDescription>{t('MessagesPage.block_confirm_desc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlockUser} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isPending ? t('MessagesPage.blocking') : t('MessagesPage.confirm_block')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('MessagesPage.delete_history_title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('MessagesPage.delete_history_desc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteHistory} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isPending ? t('MessagesPage.deleting') : t('MessagesPage.confirm_delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isRemoveFriendAlertOpen} onOpenChange={setIsRemoveFriendAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('MessagesPage.remove_friend_title', { name: recipient?.name })}</AlertDialogTitle>
            <AlertDialogDescription>{t('MessagesPage.remove_friend_desc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveFriend} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isPending ? t('MessagesPage.removing') : t('MessagesPage.confirm_remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
