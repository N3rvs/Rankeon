'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from '@/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Users, PlusCircle } from 'lucide-react';
import { createTeam, CreateTeamSchema, type CreateTeamData } from '@/lib/actions/teams';

export function CreateTeamDialog() {
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
          title: '¡Equipo Creado!',
          description: `Tu nuevo equipo "${values.name}" está listo.`,
        });
        setIsOpen(false);
        form.reset();
        // For now, let's just refresh to show the new state
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
          Crear Equipo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear tu Equipo</DialogTitle>
          <DialogDescription>
            Rellena los detalles para crear tu propio equipo. Como fundador, podrás gestionarlo.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Equipo</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Dragones Cósmicos" {...field} />
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
                  <FormLabel>Juego Principal</FormLabel>
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
                  <FormLabel>Descripción (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe los objetivos y la cultura de tu equipo..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Creando...' : 'Confirmar y Crear Equipo'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
