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
import { setUserRole } from '@/lib/actions/users';

const profileFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }).max(50),
  bio: z.string().max(300).optional(),
  lookingForTeam: z.boolean().default(false),
  role: z.string(), // We'll use the UserRole type, but zod will see a string
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function EditProfileForm({ userProfile, onFinished }: { userProfile: UserProfile, onFinished: () => void }) {
  const { toast } = useToast();
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: userProfile.name || '',
      bio: userProfile.bio || '',
      lookingForTeam: userProfile.lookingForTeam || false,
      role: userProfile.role || 'player',
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      // Update general profile data
      const { role, ...profileData } = data;
      const userDocRef = doc(db, 'users', userProfile.id);
      await updateDoc(userDocRef, profileData);

      // Update role if changed and user is admin
      if (userProfile.role === 'admin' && data.role !== userProfile.role) {
        await setUserRole(userProfile.id, data.role);
        // Note: The user might need to sign out and back in for the new role to be reflected in their token.
        toast({
          title: 'Role Updated',
          description: 'User role has been changed. Changes may require a fresh login to take full effect.',
        });
      } else {
         toast({
            title: 'Profile Updated',
            description: 'Your profile has been successfully updated.',
         });
      }
      
      onFinished();
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const validRoles: UserRole[] = ["admin", "moderator", "founder", "coach", "player"];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Your display name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea placeholder="Tell us a little about yourself" className="resize-none" {...field} />
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

        {userProfile.role === 'admin' && (
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>User Role (Admin)</FormLabel>
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

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </Form>
  );
}
