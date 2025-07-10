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
import { Globe, Shield } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { useAuth } from '@/contexts/auth-context';
import { useI18n } from '@/contexts/i18n-context';

const profileFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }).max(50),
  country: z.string().max(50).optional(),
  bio: z.string().max(300).optional(),
  rank: z.string().optional(),
  primaryGame: z.string().min(1, "Please select a primary game."),
  lookingForTeam: z.boolean().default(false),
  skills: z.array(z.string()).max(2, { message: "Puedes seleccionar hasta 2 roles." }).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const gameRoles: Record<string, readonly string[]> = {
  Valorant: ["Controlador", "Iniciador", "Duelista", "Centinela"],
};
const availableGames = Object.keys(gameRoles);

const europeanCountries = [
    { value: 'Albania', label: 'Albania' },
    { value: 'Andorra', label: 'Andorra' },
    { value: 'Austria', label: 'Austria' },
    { value: 'Belarus', label: 'Belarus' },
    { value: 'Belgium', label: 'Belgium' },
    { value: 'Bosnia and Herzegovina', label: 'Bosnia and Herzegovina' },
    { value: 'Bulgaria', label: 'Bulgaria' },
    { value: 'Croatia', label: 'Croatia' },
    { value: 'Cyprus', label: 'Cyprus' },
    { value: 'Czech Republic', label: 'Czech Republic' },
    { value: 'Denmark', label: 'Denmark' },
    { value: 'Estonia', label: 'Estonia' },
    { value: 'Finland', label: 'Finland' },
    { value: 'France', label: 'France' },
    { value: 'Germany', label: 'Germany' },
    { value: 'Greece', label: 'Greece' },
    { value: 'Hungary', label: 'Hungary' },
    { value: 'Iceland', label: 'Iceland' },
    { value: 'Ireland', label: 'Ireland' },
    { value: 'Italy', label: 'Italy' },
    { value: 'Latvia', label: 'Latvia' },
    { value: 'Liechtenstein', label: 'Liechtenstein' },
    { value: 'Lithuania', label: 'Lithuania' },
    { value: 'Luxembourg', label: 'Luxembourg' },
    { value: 'Malta', label: 'Malta' },
    { value: 'Moldova', label: 'Moldova' },
    { value: 'Monaco', label: 'Monaco' },
    { value: 'Montenegro', label: 'Montenegro' },
    { value: 'Netherlands', label: 'Netherlands' },
    { value: 'North Macedonia', label: 'North Macedonia' },
    { value: 'Norway', label: 'Norway' },
    { value: 'Poland', label: 'Poland' },
    { value: 'Portugal', label: 'Portugal' },
    { value: 'Romania', label: 'Romania' },
    { value: 'Russia', label: 'Russia' },
    { value: 'San Marino', label: 'San Marino' },
    { value: 'Serbia', label: 'Serbia' },
    { value: 'Slovakia', label: 'Slovakia' },
    { value: 'Slovenia', label: 'Slovenia' },
    { value: 'Spain', label: 'Spain' },
    { value: 'Sweden', label: 'Sweden' },
    { value: 'Switzerland', label: 'Switzerland' },
    { value: 'Ukraine', label: 'Ukraine' },
    { value: 'United Kingdom', label: 'United Kingdom' },
    { value: 'Vatican City', label: 'Vatican City' }
];

export function EditProfileForm({ userProfile, onFinished }: { userProfile: UserProfile, onFinished: () => void }) {
  const { userProfile: loggedInUserProfile } = useAuth();
  const { t } = useI18n();
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
      rank: userProfile.rank || '',
      primaryGame: userProfile.primaryGame || 'Valorant',
      lookingForTeam: userProfile.lookingForTeam || false,
      skills: userProfile.skills || [],
    },
  });
  
  const valorantRanks = [
    { value: 'Hierro', label: t('Ranks.iron') },
    { value: 'Bronce', label: t('Ranks.bronze') },
    { value: 'Plata', label: t('Ranks.silver') },
    { value: 'Oro', label: t('Ranks.gold') },
    { value: 'Platino', label: t('Ranks.platinum') },
    { value: 'Diamante', label: t('Ranks.diamond') },
    { value: 'Ascendente', label: t('Ranks.ascendant') },
    { value: 'Inmortal', label: t('Ranks.immortal') },
    { value: 'Radiante', label: t('Ranks.radiant') },
];

  const isEditingSelf = loggedInUserProfile?.id === userProfile.id;
  const isGameFieldsLocked = isEditingSelf && !!userProfile.teamId;

  const selectedGame = form.watch('primaryGame');
  const selectedSkills = form.watch('skills') || [];

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
        
        const updatePayload: Partial<UserProfile> = {
            name: data.name,
            country: data.country,
            bio: data.bio,
            avatarUrl: newAvatarUrl,
        };

        if (!isGameFieldsLocked) {
            updatePayload.primaryGame = data.primaryGame;
            updatePayload.rank = data.rank;
            updatePayload.lookingForTeam = data.lookingForTeam;
            updatePayload.skills = data.skills;
        }

        const userDocRef = doc(db, 'users', userProfile.id);
        await updateDoc(userDocRef, updatePayload);
        
        toast({
            title: 'Profile Updated',
            description: "Your profile has been successfully updated.",
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
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <Avatar className="h-20 w-20 shrink-0">
                <AvatarImage src={avatarPreview || undefined} alt="Avatar Preview" data-ai-hint="person avatar"/>
                <AvatarFallback>{userProfile.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="grid w-full max-w-sm items-center gap-1.5">
                <FormLabel htmlFor="avatar-upload">{t('EditProfileDialog.update_avatar')}</FormLabel>
                <Input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarChange} />
            </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
                <FormItem>
                <FormLabel>{t('EditProfileDialog.name')}</FormLabel>
                <FormControl>
                    <Input placeholder={t('EditProfileDialog.display_name_placeholder')} {...field} />
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
                  <FormLabel>{t('EditProfileDialog.country')}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('EditProfileDialog.select_country')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {europeanCountries.map(country => (
                        <SelectItem key={country.value} value={country.value}>
                          {country.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              <FormLabel>{t('EditProfileDialog.bio')}</FormLabel>
              <FormControl>
                <Textarea placeholder={t('EditProfileDialog.bio_placeholder')} className="resize-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="primaryGame"
            render={({ field }) => (
                <FormItem>
                <FormLabel>{t('EditProfileDialog.primary_game')}</FormLabel>
                <Select onValueChange={(value) => {
                    field.onChange(value);
                    form.setValue('skills', []); // Reset skills when game changes
                    }} 
                    defaultValue={field.value}
                    disabled={isGameFieldsLocked}
                >
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder={t('EditProfileDialog.select_game')} />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {availableGames.map(game => (
                        <SelectItem key={game} value={game}>{game}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                {isGameFieldsLocked && <FormDescription>{t('EditProfileDialog.team_member_alert_desc')}</FormDescription>}
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="rank"
            render={({ field }) => (
                <FormItem>
                <FormLabel>{t('EditProfileDialog.rank')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isGameFieldsLocked}>
                    <FormControl>
                        <SelectTrigger>
                            <Shield className="mr-2 h-4 w-4" />
                            <SelectValue placeholder={t('EditProfileDialog.select_rank')} />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {valorantRanks.map(rank => (
                        <SelectItem key={rank.value} value={rank.value}>{rank.label}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <FormField
            control={form.control}
            name="lookingForTeam"
            render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                        <FormLabel>{t('EditProfileDialog.looking_for_team')}</FormLabel>
                        <FormDescription>
                        {t('EditProfileDialog.looking_for_team_desc')}
                        </FormDescription>
                    </div>
                    <FormControl>
                        <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isGameFieldsLocked}
                        />
                    </FormControl>
                </FormItem>
            )}
        />

        <FormField
            control={form.control}
            name="skills"
            render={() => (
                <FormItem>
                    <FormLabel>{t('EditProfileDialog.skills_roles')}</FormLabel>
                    <FormDescription>
                        {t('EditProfileDialog.skills_roles_desc')}
                    </FormDescription>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        {(gameRoles[selectedGame] || []).map((role) => (
                        <FormField
                            key={role}
                            control={form.control}
                            name="skills"
                            render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                <FormControl>
                                <Checkbox
                                    checked={field.value?.includes(role)}
                                    disabled={isGameFieldsLocked || (!field.value?.includes(role) && selectedSkills.length >= 2)}
                                    onCheckedChange={(checked) => {
                                        const currentSkills = field.value || [];
                                        return checked
                                            ? field.onChange([...currentSkills, role])
                                            : field.onChange(currentSkills.filter((value) => value !== role));
                                    }}
                                />
                                </FormControl>
                                <FormLabel className="font-normal">{role}</FormLabel>
                            </FormItem>
                            )}
                        />
                        ))}
                    </div>
                    <FormMessage />
                </FormItem>
            )}
        />

        <Button type="submit" className="w-full" disabled={isPending || form.formState.isSubmitting}>
          {isPending ? t('EditProfileDialog.saving') : t('EditProfileDialog.save_changes')}
        </Button>
      </form>
    </Form>
  );
}
