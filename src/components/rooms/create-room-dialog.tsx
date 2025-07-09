'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle } from 'lucide-react';
import { createRoom } from '@/lib/actions/rooms';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/contexts/i18n-context';

export function CreateRoomDialog() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const formSchema = z.object({
    name: z.string().min(3, t('CreateRoomDialog.errors.name_min')).max(50, t('CreateRoomDialog.errors.name_max')),
    game: z.string().min(1).default('Valorant'),
    server: z.string().min(1, t('CreateRoomDialog.errors.server_required')),
    rank: z.string().min(1, t('CreateRoomDialog.errors.rank_required')),
    partySize: z.string().min(1, t('CreateRoomDialog.errors.party_size_required')),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      game: 'Valorant',
      server: '',
      rank: '',
      partySize: '',
    },
  });

  const valorantServers = [
      { value: 'Frankfurt', label: t('Countries.germany') },
      { value: 'London', label: t('Countries.united_kingdom') },
      { value: 'Madrid', label: t('Countries.spain') },
      { value: 'Paris', label: t('Countries.france') },
  ];

  const valorantRanks = [
      { value: 'Hierro', label: t('Ranks.iron') },
      { value: 'Bronce', label: t('Ranks.bronze') },
      { value: 'Plata', label: t('Ranks.silver') },
      { value: 'Oro', label: t('Ranks.gold') },
      { value: 'Platino', label: t('Ranks.platinum') },
      { value: 'Ascendente', label: t('Ranks.ascendant') },
      { value: 'Inmortal', label: t('Ranks.immortal') },
  ];

  const partySizes = [
      { value: 'Duo', label: t('PartySizes.duo') },
      { value: 'Trio', label: t('PartySizes.trio') },
      { value: 'Full Stack', label: t('PartySizes.full_stack') },
  ];

  async function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      const result = await createRoom(values);
      if (result.success) {
        toast({
          title: t('CreateRoomDialog.success_title'),
          description: t('CreateRoomDialog.success_desc', { name: values.name }),
        });
        setIsOpen(false);
        form.reset();
      } else {
        toast({
          title: t('CreateRoomDialog.error_title'),
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
          {t('CreateRoomDialog.trigger')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('CreateRoomDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('CreateRoomDialog.description')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('CreateRoomDialog.name_label')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('CreateRoomDialog.name_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <div className="grid grid-cols-2 gap-4">
                 <FormField
                  control={form.control}
                  name="rank"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('CreateRoomDialog.target_rank_label')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('CreateRoomDialog.select_rank_placeholder')} />
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
                 <FormField
                  control={form.control}
                  name="partySize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('CreateRoomDialog.party_size_label')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('CreateRoomDialog.select_size_placeholder')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {partySizes.map(size => (
                            <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
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
              name="server"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('CreateRoomDialog.server_label')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('CreateRoomDialog.select_server_placeholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {valorantServers.map(server => (
                        <SelectItem key={server.value} value={server.value}>{server.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? t('CreateRoomDialog.creating_button') : t('CreateRoomDialog.create_button')}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
