'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile, UserRole } from '@/lib/types';
import { updateUserRole } from '@/lib/actions/users';

const roleSchema = z.object({
  role: z.string().min(1, 'Role is required.'),
});

interface RoleManagementDialogProps {
  user: UserProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const VALID_ROLES: UserRole[] = ['admin', 'moderator', 'player'];

export function RoleManagementDialog({ user, open, onOpenChange }: RoleManagementDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof roleSchema>>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      role: user.role,
    },
  });

  const onSubmit = (values: z.infer<typeof roleSchema>) => {
    startTransition(async () => {
      if (values.role === user.role) {
        onOpenChange(false);
        return;
      }

      const result = await updateUserRole({ uid: user.id, role: values.role as UserRole });
      if (result.success) {
        toast({
          title: 'Role Updated',
          description: `${user.name}'s role has been changed to ${values.role}.`,
        });
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
          <DialogTitle>Change Role for {user.name}</DialogTitle>
          <DialogDescription>
            Select a new role for this user. This will change their permissions across the app.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={user.role === 'founder'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {VALID_ROLES.map((role) => (
                        <SelectItem key={role} value={role} className="capitalize">
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {user.role === 'founder' && (
                    <p className="text-sm text-muted-foreground pt-2">
                      The 'founder' role cannot be changed manually. It is tied to team ownership.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending || user.role === 'founder'}>
              {isPending ? 'Saving...' : 'Save Role'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
