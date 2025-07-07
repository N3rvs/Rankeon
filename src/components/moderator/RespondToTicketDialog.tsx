
'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { SupportTicket, TicketMessage } from '@/lib/types';
import { respondToTicket, resolveTicket } from '@/lib/actions/tickets';
import { ScrollArea } from '../ui/scroll-area';
import { collection, query, orderBy, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

const messageSchema = z.object({
  content: z.string().min(1, "Response cannot be empty."),
});

interface RespondToTicketDialogProps {
  ticket: SupportTicket;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ChatBubble({ message, isStaff }: { message: TicketMessage; isStaff: boolean }) {
    return (
        <div className={cn("flex items-start gap-3", isStaff ? "flex-row-reverse" : "")}>
            <Avatar className="h-8 w-8">
                <AvatarFallback>{message.senderName.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <div className={cn("p-3 rounded-lg", isStaff ? "bg-primary text-primary-foreground" : "bg-muted")}>
                    <p className="text-sm">{message.content}</p>
                </div>
                 <p className={cn("text-xs text-muted-foreground mt-1", isStaff ? "text-right" : "")}>
                    {message.senderName} · {message.createdAt ? formatDistanceToNow(message.createdAt.toDate(), { addSuffix: true }) : 'just now'}
                </p>
            </div>
        </div>
    );
}

export function RespondToTicketDialog({ ticket, open, onOpenChange }: RespondToTicketDialogProps) {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [isResponding, startResponding] = useTransition();
  const [isResolving, startResolving] = useTransition();
  const [conversation, setConversation] = useState<TicketMessage[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const form = useForm<z.infer<typeof messageSchema>>({
    resolver: zodResolver(messageSchema),
    defaultValues: { content: '' },
  });

  useEffect(() => {
    if (!open) return;
    const q = query(collection(db, 'supportTickets', ticket.id, 'conversation'), orderBy('createdAt', 'asc'));
    const unsubscribe: Unsubscribe = onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TicketMessage));
        setConversation(messages);
    });
    return () => unsubscribe();
  }, [open, ticket.id]);

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div');
        if (viewport) {
             viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [conversation]);

  const onRespond = (values: z.infer<typeof messageSchema>) => {
    startResponding(async () => {
      const result = await respondToTicket(ticket.id, values.content);
      if (result.success) {
        form.reset();
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
  };

  const onResolve = () => {
    startResolving(async () => {
        const result = await resolveTicket(ticket.id);
        if (result.success) {
            toast({ title: "Ticket Closed", description: "This ticket has been marked as resolved."});
            onOpenChange(false);
        } else {
            toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="capitalize">{ticket.subject.replace(/_/g, ' ')}</DialogTitle>
          <DialogDescription>
            Ticket from {ticket.userName} ({ticket.userEmail})
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 min-h-0">
             <ScrollArea className="h-full" ref={scrollAreaRef}>
                <div className="p-4 space-y-4">
                    <div className="bg-muted/50 p-4 rounded-lg">
                        <p className="font-semibold text-sm">Original Message</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ticket.description}</p>
                    </div>
                    {conversation.map(msg => (
                        <ChatBubble key={msg.id} message={msg} isStaff={msg.senderId !== ticket.userId} />
                    ))}
                </div>
            </ScrollArea>
        </div>
        
        {ticket.status === 'open' && (
            <div className="border-t pt-4">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onRespond)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="content"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Your Response</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Type your response..." {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter className="gap-2">
                             <Button type="button" variant="secondary" onClick={onResolve} disabled={isResolving}>
                                {isResolving ? 'Closing...' : 'Close Ticket'}
                            </Button>
                            <Button type="submit" disabled={isResponding}>
                                {isResponding ? 'Sending...' : 'Send Response'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
