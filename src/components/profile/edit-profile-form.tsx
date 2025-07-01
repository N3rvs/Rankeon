'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile, UserRole } from '@/lib/types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { updateUserRole } from '@/lib/actions/users';
import { useTransition } from 'react';
import { useAuth } from '@/contexts/auth-context';

const profileFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }).max(50),
  country: z.string().max(50).optional(),
  bio: z.string().max(300).optional(),
  lookingForTeam: z.boolean().default(false),
  role: z.string(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function EditProfileForm({ userProfile, onFinished }: { userProfile: UserProfile, onFinished: () => void }) {
  const { toast } = useToast();
  const { userProfile: adminProfile } = useAuth();
  const [isPending, startTransition] = useTransition();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: userProfile.name || '',
      country: userProfile.country || '',
      bio: userProfile.bio || '',
      lookingForTeam: userProfile.lookingForTeam || false,
      role: userProfile.role || 'player',
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    startTransition(async () => {
      try {
        const { role, ...profileData } = data;
        const userDocRef = doc(db, 'users', userProfile.id);
        await updateDoc(userDocRef, profileData);

        if (adminProfile?.role === 'admin' && data.role !== userProfile.role) {
            const result = await updateUserRole({ uid: userProfile.id, role: data.role});
            if (!result.success) {
                throw new Error(result.message);
            }
        }
        
        toast({
            title: 'Profile Updated',
            description: "The user's profile has been successfully updated.",
        });
        
        onFinished();
      } catch (error: any) {
        console.error(error);
        toast({
          title: 'Error',
          description: `Failed to update profile: ${error.message}`,
          variant: 'destructive',
        });
      }
    });
  };

  const validRoles: UserRole[] = ["admin", "moderator", "founder", "coach", "player"];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                    <Input placeholder="Display name" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl>
                    <Input placeholder="e.g. USA" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea placeholder="Tell us a little about this user" className="resize-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
            control={form.control}
            name="lookingForTeam"
            render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                        <FormLabel>Looking for a team?</FormLabel>
                    </div>
                    <FormControl>
                        <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        />
                    </FormControl>
                </FormItem>
            )}
        />

        {adminProfile?.role === 'admin' && (
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>User Role</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {validRoles.map((role) => (
                      <SelectItem key={role} value={role} className="capitalize">
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit" className="w-full" disabled={isPending || form.formState.isSubmitting}>
          {isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </Form>
  );
}
