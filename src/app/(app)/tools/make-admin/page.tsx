
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
import { Terminal, FileCode, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { scriptForClipboard } from '@/lib/admin-script';

export default function MakeAdminPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  const handleCopyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({
      title: '¡Copiado!',
      description: 'El texto ha sido copiado al portapapeles.',
    });
  };

  return (
    <div className="space-y-6">
      <Card className="max-w-3xl mx-auto">
        <CardHeader className="text-center">
          <FileCode className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="font-headline">
            Solución Definitiva: Script de Administrador
          </CardTitle>
          <CardDescription>
            Usemos la forma más fiable: un script directo en Google Cloud. Esto solucionará el problema del "Project ID".
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">1</span>
                Abre Google Cloud Shell
            </h3>
             <p className="text-sm text-muted-foreground mb-3 ml-10">
              Cloud Shell es una terminal segura en tu navegador con todo lo necesario ya instalado.
            </p>
            <Button asChild className="ml-10">
                <Link href="https://shell.cloud.google.com/" target="_blank" rel="noopener noreferrer">
                    <Terminal className="mr-2" />
                    Abrir Google Cloud Shell
                </Link>
            </Button>
          </div>

          <div>
             <h3 className="font-semibold mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">2</span>
                Crea y edita el archivo del script
            </h3>
            <p className="text-sm text-muted-foreground mb-3 ml-10">
              En Cloud Shell, abre el editor (icono de lápiz), crea un archivo llamado <strong>set-admin.js</strong> y pega el script que copies con el botón de abajo.
            </p>
             <div className="p-4 bg-muted rounded-lg ml-10">
                <p className="text-sm text-muted-foreground">Usa el botón de abajo para copiar el script al portapapeles.</p>
             </div>
             <Button variant="outline" size="sm" className="mt-2 ml-10" onClick={() => handleCopyToClipboard(scriptForClipboard)}>
                  Copiar script
             </Button>
          </div>

          <div>
             <h3 className="font-semibold mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">3</span>
                Reemplaza tu Project ID en el script
            </h3>
            <p className="text-sm text-muted-foreground mb-2 ml-10">
              Copia tu Project ID de abajo y pégalo en el script, reemplazando el texto <strong>'AQUÍ_TU_PROJECT_ID'</strong>.
            </p>
            {projectId ? (
              <div className="flex items-center gap-2 ml-10">
                <code className="relative flex-1 rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                  {projectId}
                </code>
                <Button variant="outline" size="sm" onClick={() => handleCopyToClipboard(projectId)}>
                  Copiar Project ID
                </Button>
              </div>
            ) : (
                <p className="text-sm text-destructive ml-10">No se pudo encontrar `NEXT_PUBLIC_FIREBASE_PROJECT_ID` en tus variables de entorno.</p>
            )}
          </div>

          <div>
             <h3 className="font-semibold mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">4</span>
                Reemplaza tu User ID (UID) en el script
            </h3>
            <p className="text-sm text-muted-foreground mb-2 ml-10">
              Copia tu UID de abajo y pégalo en el script, reemplazando el texto <strong>'AQUÍ_TU_UID'</strong>.
            </p>
            {loading ? (
              <Skeleton className="h-10 w-full ml-10" />
            ) : (
              <div className="flex items-center gap-2 ml-10">
                <code className="relative flex-1 rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                  {user?.uid}
                </code>
                <Button variant="outline" size="sm" onClick={() => handleCopyToClipboard(user?.uid || '')}>
                  Copiar UID
                </Button>
              </div>
            )}
          </div>
          
           <div>
             <h3 className="font-semibold mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">5</span>
                Instala las dependencias y ejecuta el script
            </h3>
            <p className="text-sm text-muted-foreground mb-3 ml-10">
              Vuelve a la terminal de Cloud Shell (no al editor) y ejecuta estos dos comandos, uno por uno:
            </p>
             <div className="space-y-3 ml-10">
                <div>
                     <code className="block w-full rounded bg-muted p-3 font-mono text-sm">npm install firebase-admin</code>
                     <Button variant="outline" size="sm" className="mt-1" onClick={() => handleCopyToClipboard('npm install firebase-admin')}>Copiar</Button>
                </div>
                <div>
                    <code className="block w-full rounded bg-muted p-3 font-mono text-sm">node set-admin.js</code>
                     <Button variant="outline" size="sm" className="mt-1" onClick={() => handleCopyToClipboard('node set-admin.js')}>Copiar</Button>
                </div>
             </div>
          </div>
          
           <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-primary-foreground font-bold">
                    <CheckCircle />
                </span>
                ¡Listo! Cierra y vuelve a iniciar sesión
            </h3>
            <p className="text-sm text-muted-foreground ml-10">
             Si el script se ejecutó con éxito, cierra la sesión en SquadUp y vuelve a entrar para que tus nuevos permisos de administrador se apliquen.
            </p>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
