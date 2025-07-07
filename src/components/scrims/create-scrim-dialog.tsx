
'use client';

import { useState, useTransition, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Calendar as CalendarIcon, Flame } from 'lucide-react';
import { CreateScrimSchema, CreateScrimData, createScrimAction } from '@/lib/actions/scrims';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useI18n } from '@/contexts/i18n-context';
import { doc, onSnapshot } from "firebase/firestore";
import { db } from '@/lib/firebase/client';
import type { Team } from '@/lib/types';
import { Textarea } from '../ui/textarea';

export function CreateScrimDialog({ teamId }: { teamId: string }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<Omit<CreateScrimData, 'teamId'>>({
    resolver: zodResolver(CreateScrimSchema.omit({ teamId: true })),
    defaultValues: {
      format: 'bo3',
      type: 'scrim',
      rankMin: '',
      rankMax: '',
      notes: '',
    },
  });

  // Fetch team data to pre-fill ranks when dialog opens
  useEffect(() => {
    if (!isOpen || !teamId) return;
    
    const unsub = onSnapshot(doc(db, "teams", teamId), (doc) => {
        if (doc.exists()) {
            const teamData = doc.data() as Team;
            form.reset({
                ...form.getValues(),
                rankMin: teamData.rankMin || '',
                rankMax: teamData.rankMax || ''
            });
        }
    });
    return () => unsub();
  }, [isOpen, teamId, form]);

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

  const scrimFormats = [
    { value: 'bo1', label: t('ScrimsPage.formats.bo1') },
    { value: 'bo3', label: t('ScrimsPage.formats.bo3') },
    { value: 'bo5', label: t('ScrimsPage.formats.bo5') },
  ];

  const scrimTypes = [
    { value: 'scrim', label: t('ScrimsPage.types.scrim') },
    { value: 'tryout', label: t('ScrimsPage.types.tryout') },
  ];

  async function onSubmit(values: Omit<CreateScrimData, 'teamId'>) {
    startTransition(async () => {
      const result = await createScrimAction({ ...values, teamId });
      if (result.success) {
        toast({ title: t('ScrimsPage.scrim_posted_title'), description: t('ScrimsPage.scrim_posted_desc') });
        setIsOpen(false);
        form.reset();
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Flame className="mr-2 h-4 w-4" />
          {t('ScrimsPage.create_scrim')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('ScrimsPage.create_scrim')}</DialogTitle>
          <DialogDescription>
            {t('ScrimsPage.create_scrim_desc')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('ScrimsPage.date_label')}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                        >
                          {field.value ? format(field.value, "PPP") : <span>{t('ProposeTournamentDialog.pick_date')}</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date() } initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="format"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>{t('ScrimsPage.format_label')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{scrimFormats.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>{t('ScrimsPage.type_label')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{scrimTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="rankMin"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>{t('EditTeamDialog.min_rank')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder={t('ProposeTournamentDialog.no_restriction')} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {valorantRanks.map((rank) => (
                            <SelectItem key={rank.value} value={rank.value}>
                                {rank.label}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="rankMax"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>{t('EditTeamDialog.max_rank')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder={t('ProposeTournamentDialog.no_restriction')} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {valorantRanks.map((rank) => (
                            <SelectItem key={rank.value} value={rank.value}>
                                {rank.label}
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('ScrimsPage.notes_label')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('ScrimsPage.notes_placeholder')}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? t('ScrimsPage.posting') : t('ScrimsPage.create_scrim')}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
