// src/components/profile/edit-profile-form.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';
import { doc, updateDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase/client';
import { useTransition, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Info } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';

const profileFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }).max(50),
  country: z.string().max(50).optional(),
  bio: z.string().max(300).optional(),
  lookingForTeam: z.boolean().default(false),
  skills: z.array(z.string()).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function EditProfileForm({ userProfile, onFinished }: { userProfile: UserProfile, onFinished: () => void }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(userProfile.avatarUrl);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: userProfile.name || '',
      country: userProfile.country || '',
      bio: userProfile.bio || '',
      lookingForTeam: userProfile.lookingForTeam || false,
      skills: userProfile.skills || [],
    },
  });

  const isMemberOfTeam = !!userProfile.teamId;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const onSubmit = async (data: ProfileFormValues) => {
    startTransition(async () => {
      try {
        let newAvatarUrl = userProfile.avatarUrl;

        if (avatarFile) {
          const storageRef = ref(storage, `avatars/${userProfile.id}/${avatarFile.name}`);
          const uploadResult = await uploadBytes(storageRef, avatarFile);
          newAvatarUrl = await getDownloadURL(uploadResult.ref);
        }
        
        const profileData = data;
        const userDocRef = doc(db, 'users', userProfile.id);
        await updateDoc(userDocRef, { ...profileData, avatarUrl: newAvatarUrl });
        
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
                <AvatarImage src={avatarPreview || undefined} alt="Avatar Preview" data-ai-hint="person avatar"/>
                <AvatarFallback>{userProfile.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="grid w-full max-w-sm items-center gap-1.5">
                <FormLabel htmlFor="avatar-upload">Update Avatar</FormLabel>
                <Input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarChange} />
            </div>
        </div>
        
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
        
        {isMemberOfTeam && (
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Eres miembro de un equipo</AlertTitle>
                <AlertDescription>
                   Tu estado de "buscando equipo" y tus habilidades son gestionados por el líder de tu equipo. Para cambiarlos, sal de tu equipo actual.
                </AlertDescription>
            </Alert>
        )}

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
                        disabled={isMemberOfTeam}
                        />
                    </FormControl>
                </FormItem>
            )}
        />

        <FormField
            control={form.control}
            name="skills"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Skills</FormLabel>
                    <FormControl>
                         <Input placeholder="Duelist, IGL, Support..." {...field} disabled={isMemberOfTeam} value={Array.isArray(field.value) ? field.value.join(', ') : ''} onChange={e => field.onChange(e.target.value.split(',').map(s => s.trim()))} />
                    </FormControl>
                     <FormDescription>
                        Separa las habilidades con comas.
                    </FormDescription>
                    <FormMessage />
                </FormItem>
            )}
        />

        <Button type="submit" className="w-full" disabled={isPending || form.formState.isSubmitting}>
          {isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </Form>
  );
}
