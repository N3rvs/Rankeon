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
import { useAuth } from '@/contexts/auth-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.').max(50, 'El nombre debe tener menos de 50 caracteres.'),
  game: z.string().min(1, 'Por favor, introduce un juego.').default('Valorant'),
  server: z.string().min(1, 'Por favor, selecciona un servidor.'),
});

const valorantServers = [
    { value: 'NA', label: 'Norteamérica (NA)' },
    { value: 'EU', label: 'Europa (EU)' },
    { value: 'LATAM', label: 'Latinoamérica (LATAM)' },
    { value: 'BR', label: 'Brasil (BR)' },
    { value: 'KR', label: 'Corea (KR)' },
    { value: 'AP', label: 'Asia-Pacífico (AP)' },
];

export function CreateRoomDialog() {
  const { toast } = useToast();
  const { token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      game: 'Valorant',
      server: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      const result = await createRoom(values, token);
      if (result.success) {
        toast({
          title: '¡Sala Creada!',
          description: `Tu nueva sala "${values.name}" está lista.`,
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
          Crear Sala
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear una Nueva Sala de Juego</DialogTitle>
          <DialogDescription>
            Rellena los detalles para crear una sala donde otros puedan unirse.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la Sala</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Ranked Nocturno" {...field} />
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
                  <FormLabel>Juego</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="server"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Servidor</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un servidor de Valorant" />
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
              {isPending ? 'Creando...' : 'Crear Sala'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
