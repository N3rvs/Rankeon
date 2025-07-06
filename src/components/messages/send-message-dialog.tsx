
'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';
import { sendMessageToFriend } from '@/lib/actions/messages';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

const messageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty.').max(500, 'Message is too long.'),
});

interface SendMessageDialogProps {
  recipient: UserProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMessageSent?: () => void;
}

export function SendMessageDialog({ recipient, open, onOpenChange, onMessageSent }: SendMessageDialogProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { userProfile } = useAuth();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof messageSchema>>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      content: '',
    },
  });

  const onSubmit = (values: z.infer<typeof messageSchema>) => {
    startTransition(async () => {
      if (!userProfile?.friends?.includes(recipient.id)) {
        toast({
          title: 'Not Friends Yet',
          description: `You must be friends with ${recipient.name} to send them a message.`,
          variant: 'destructive',
        });
        return;
      }

      const result = await sendMessageToFriend({ to: recipient.id, content: values.content });

      if (result.success) {
        toast({
          title: 'Message Sent!',
          description: `Your message to ${recipient.name} has been sent.`,
        });
        form.reset();
        onOpenChange(false);
        if (onMessageSent) {
          onMessageSent();
        } else {
            router.push('/messages');
        }
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Message to {recipient.name}</DialogTitle>
          <DialogDescription>
            Start a new conversation. If you are not friends yet, add them first.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={`Type your message to ${recipient.name}...`}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Sending...' : 'Send Message'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
