// src/components/teams/create-team-dialog.tsx
'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle } from 'lucide-react';
import { createTeam, CreateTeamSchema, type CreateTeamData } from '@/lib/actions/teams';
import { useI18n } from '@/contexts/i18n-context';

export function CreateTeamDialog() {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<CreateTeamData>({
    resolver: zodResolver(CreateTeamSchema),
    defaultValues: {
      name: '',
      game: 'Valorant',
      description: '',
    },
  });

  async function onSubmit(values: CreateTeamData) {
    startTransition(async () => {
      const result = await createTeam(values);
      if (result.success && result.teamId) {
        toast({
          title: t('CreateTeamDialog.title'),
          description: `Tu nuevo equipo "${values.name}" está listo.`,
        });
        setIsOpen(false);
        form.reset();
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('TeamsPage.create_team')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('CreateTeamDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('CreateTeamDialog.description')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('CreateTeamDialog.team_name')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('CreateTeamDialog.team_name_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="game"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('CreateTeamDialog.primary_game')}</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Valorant" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('CreateTeamDialog.description_optional')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('CreateTeamDialog.description_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? t('CreateTeamDialog.creating') : t('CreateTeamDialog.confirm_create')}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
