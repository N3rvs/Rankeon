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
import { Lightbulb, Terminal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

export default function MakeAdminPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();

  const handleCopyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({
      title: '¡Copiado!',
      description: 'El texto ha sido copiado al portapapeles.',
    });
  };

  const commandText = `gcloud identity-platform users update ${user?.uid || 'TU_UID_AQUÍ'} --update-custom-attributes='{"role":"admin"}' --project=TU_PROJECT_ID_AQUÍ`;

  return (
    <div className="space-y-6">
      <Card className="max-w-3xl mx-auto">
        <CardHeader className="text-center">
          <Terminal className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="font-headline">
            Guía Definitiva para ser Administrador
          </CardTitle>
          <CardDescription>
            El botón en la app no funcionó. Usemos un método 100% fiable:
            la terminal de Google Cloud.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-start gap-4">
              <Lightbulb className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-primary">¿Por qué este método?</h4>
                <p className="text-sm text-primary/80">
                  Este comando habla directamente con los servidores de Google,
                  evitando cualquier problema del entorno de la aplicación. Es la forma más
                  segura de asignar tu rol.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Paso 1: Copia tu User ID (UID)</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Este es tu identificador único en Firebase. Lo necesitarás para el comando.
            </p>
            {loading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="flex items-center gap-2">
                <code className="relative flex-1 rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                  {user?.uid}
                </code>
                <Button variant="outline" size="sm" onClick={() => handleCopyToClipboard(user?.uid || '')}>
                  Copiar
                </Button>
              </div>
            )}
          </div>

           <div>
            <h3 className="font-semibold mb-2">Paso 2: Abre la Terminal de Google Cloud (Cloud Shell)</h3>
             <p className="text-sm text-muted-foreground mb-2">
              Cloud Shell es una terminal segura que se ejecuta en tu navegador y ya tiene todo lo necesario preinstalado.
            </p>
            <Button asChild>
                <Link href="https://shell.cloud.google.com/" target="_blank" rel="noopener noreferrer">
                    <Terminal className="mr-2" />
                    Abrir Google Cloud Shell
                </Link>
            </Button>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Paso 3: Ejecuta el comando</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Copia este comando, reemplaza <strong>TU_PROJECT_ID_AQUÍ</strong> con el ID de tu proyecto de Firebase/Google Cloud, pégalo en la terminal y presiona Enter.
            </p>
             <div className="p-4 bg-muted rounded-lg">
                <code className="block whitespace-pre-wrap text-sm">
                 {commandText}
                </code>
             </div>
             <Button variant="outline" size="sm" className="mt-2" onClick={() => handleCopyToClipboard(commandText)}>
                  Copiar comando
             </Button>
          </div>
          
           <div>
            <h3 className="font-semibold mb-2">Paso 4: ¡Listo! Cierra y vuelve a iniciar sesión</h3>
            <p className="text-sm text-muted-foreground">
             Una vez que el comando se complete con éxito, cierra la sesión en SquadUp y vuelve a entrar para que tus nuevos permisos de administrador se apliquen.
            </p>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
