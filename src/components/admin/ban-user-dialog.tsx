
'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';
import { updateUserStatus } from '@/lib/actions/users';

const banSchema = z.object({
  banType: z.enum(['temporary', 'permanent']),
  duration: z.coerce.number().int().positive('Duration must be a positive number.').optional(),
  unit: z.enum(['hours', 'days']).default('hours'),
});

interface BanUserDialogProps {
  user: UserProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BanUserDialog({ user, open, onOpenChange }: BanUserDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof banSchema>>({
    resolver: zodResolver(banSchema),
    defaultValues: {
      banType: 'permanent',
    },
  });
  
  const banType = form.watch('banType');

  const onSubmit = (values: z.infer<typeof banSchema>) => {
    if (values.banType === 'temporary' && !values.duration) {
      form.setError('duration', { type: 'manual', message: 'Duration is required for a temporary ban.' });
      return;
    }

    startTransition(async () => {
      let durationInHours: number | undefined = undefined;
      if (values.banType === 'temporary' && values.duration) {
        durationInHours = values.unit === 'days' ? values.duration * 24 : values.duration;
      }
      
      const result = await updateUserStatus({ uid: user.id, disabled: true, duration: durationInHours });
      
      if (result.success) {
        toast({ title: 'Success', description: result.message });
        onOpenChange(false);
        form.reset({ banType: 'permanent' });
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ban {user.name}</DialogTitle>
          <DialogDescription>
            Choose the type and duration of the ban. This will prevent the user from logging in.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="banType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Ban Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex gap-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="permanent" />
                        </FormControl>
                        <FormLabel className="font-normal">Permanent</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="temporary" />
                        </FormControl>
                        <FormLabel className="font-normal">Temporary</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {banType === 'temporary' && (
              <div className="grid grid-cols-2 gap-4">
                 <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                     <FormItem>
                        <FormLabel>Duration</FormLabel>
                        <FormControl>
                           <Input
                             type="number"
                             placeholder="e.g., 24"
                             {...field}
                             value={field.value ?? ''}
                             onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.value)}
                           />
                        </FormControl>
                        <FormMessage />
                     </FormItem>
                  )}
                 />
                 <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                     <FormItem>
                        <FormLabel>Unit</FormLabel>
                         <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select unit" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="hours">Hours</SelectItem>
                                <SelectItem value="days">Days</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                     </FormItem>
                  )}
                 />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isPending} variant="destructive">
              {isPending ? 'Banning...' : 'Confirm Ban'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
