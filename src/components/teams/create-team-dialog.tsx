'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle } from 'lucide-react';
import { createTeam } from '@/lib/actions/teams';

const formSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.').max(50, 'El nombre debe tener menos de 50 caracteres.'),
  game: z.string().min(1, 'Por favor, introduce un juego.'),
  description: z.string().max(300, 'La descripción debe tener menos de 300 caracteres.').optional(),
});

export function CreateTeamDialog() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      game: '',
      description: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      const result = await createTeam(values);
      if (result.success) {
        toast({
          title: '¡Equipo Creado!',
          description: `Tu nuevo equipo "${values.name}" está listo.`,
        });
        setIsOpen(false);
        form.reset();
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
          <DialogTitle>Crear un Nuevo Equipo</DialogTitle>
          <DialogDescription>
            Reúne a tu escuadrón. Rellena los siguientes datos para empezar.
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
                    <Input placeholder="Ej: Phantom Thieves" {...field} />
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
                    <Input placeholder="Ej: Valorant" {...field} />
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
                  <FormLabel>Descripción del Equipo</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Cuéntales a todos de qué va tu equipo." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Creando...' : 'Crear Equipo'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
