// src/components/support/create-ticket-dialog.tsx
'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CreateTicketSchema, createSupportTicket, type CreateTicketData } from '@/lib/actions/tickets';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/contexts/i18n-context';

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTicketDialog({ open, onOpenChange }: CreateTicketDialogProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<CreateTicketData>({
    resolver: zodResolver(CreateTicketSchema),
    defaultValues: {
      subject: '',
      description: '',
    },
  });

  const subjects = [
    { value: 'general_question', label: t('SupportDialog.subject_general') },
    { value: 'bug_report', label: t('SupportDialog.subject_bug') },
    { value: 'feature_request', label: t('SupportDialog.subject_feature') },
    { value: 'account_issue', label: t('SupportDialog.subject_account') },
  ];

  const onSubmit = (values: CreateTicketData) => {
    startTransition(async () => {
      const result = await createSupportTicket(values);
      if (result.success) {
        toast({
          title: 'Ticket Submitted',
          description: "Our team will get back to you as soon as possible.",
        });
        form.reset();
        onOpenChange(false);
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
          <DialogTitle>{t('SupportDialog.title')}</DialogTitle>
          <DialogDescription>{t('SupportDialog.description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('SupportDialog.subject')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('SupportDialog.select_subject')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subjects.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('SupportDialog.describe_issue')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please provide as much detail as possible..."
                      className="resize-none min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? t('SupportDialog.submitting') : t('SupportDialog.submit')}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
