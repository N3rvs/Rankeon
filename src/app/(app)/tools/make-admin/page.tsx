'use client';

import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { grantFirstAdminRole } from '@/lib/actions/admin';
import { useTransition } from 'react';

export default function MakeAdminPage() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleGrantAdmin = () => {
    if (!user || !token) {
      toast({
        title: 'Error',
        description: 'Debes iniciar sesión para realizar esta acción.',
        variant: 'destructive',
      });
      return;
    }

    startTransition(async () => {
      try {
        const result = await grantFirstAdminRole(token);
        if (result.success) {
          toast({
            title: '¡Éxito!',
            description: result.message,
          });
        } else {
          toast({
            title: 'La operación falló',
            description: result.message,
            variant: 'destructive',
          });
        }
      } catch (error: any) {
        toast({
          title: 'Error inesperado',
          description:
            'Ocurrió un error al intentar asignar el rol de administrador.',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="font-headline">
            Conviértete en el Primer Administrador
          </CardTitle>
          <CardDescription>
            Usa este botón de un solo uso para asignarte el rol de administrador.
            Esta acción solo funcionará si no hay otros administradores en el
            sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={handleGrantAdmin} disabled={isPending || !user}>
            {isPending
              ? 'Asignando rol...'
              : 'Convertirme en el Primer Administrador'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
