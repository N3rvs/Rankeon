'use client';

import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Terminal, FileCode, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { scriptForClipboard } from '@/lib/admin-script';

export default function MakeAdminPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  const handleCopyToClipboard = (text: string | undefined) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copiado!',
      description: 'El texto ha sido copiado al portapapeles.',
    });
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="text-center p-4 border rounded-lg bg-card">
        <FileCode className="mx-auto h-12 w-12 text-primary" />
        <h1 className="text-2xl font-bold font-headline mt-2">
          Solución Definitiva: Script de Administrador
        </h1>
        <p className="text-muted-foreground">
          Usa Cloud Shell para asignarte el rol de admin de forma segura.
        </p>
      </div>

      <div className="space-y-6">
        <section>
          <h3 className="font-semibold text-lg mb-2">1. Abre Google Cloud Shell</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Cloud Shell es una terminal en tu navegador con todo lo necesario ya instalado.
          </p>
          <Button asChild>
            <Link href="https://shell.cloud.google.com/" target="_blank" rel="noopener noreferrer">
              <Terminal className="mr-2" />
              Abrir Google Cloud Shell
            </Link>
          </Button>
        </section>

        <section>
          <h3 className="font-semibold text-lg mb-2">2. Crea un archivo y pega el script</h3>
          <p className="text-sm text-muted-foreground mb-3">
            En Cloud Shell, crea un archivo llamado <strong>set-admin.js</strong>, ábrelo con el editor y pega el script que copies con el botón de abajo.
          </p>
          <Button variant="outline" size="sm" onClick={() => handleCopyToClipboard(scriptForClipboard)}>
            Copiar script
          </Button>
        </section>

        <section>
          <h3 className="font-semibold text-lg mb-2">3. Reemplaza tu Project ID en el script</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Copia tu Project ID de abajo y pégalo en el script, reemplazando el texto <strong>'AQUÍ_TU_PROJECT_ID'</strong>.
          </p>
          {projectId ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted px-3 py-2 font-mono text-sm">
                {projectId}
              </code>
              <Button variant="outline" size="sm" onClick={() => handleCopyToClipboard(projectId)}>
                Copiar Project ID
              </Button>
            </div>
          ) : (
            <p className="text-sm text-destructive">No se pudo encontrar `NEXT_PUBLIC_FIREBASE_PROJECT_ID`.</p>
          )}
        </section>

        <section>
          <h3 className="font-semibold text-lg mb-2">4. Reemplaza tu User ID (UID) en el script</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Copia tu UID de abajo y pégalo en el script, reemplazando el texto <strong>'AQUÍ_TU_UID'</strong>.
          </p>
          {loading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted px-3 py-2 font-mono text-sm">
                {user?.uid}
              </code>
              <Button variant="outline" size="sm" onClick={() => handleCopyToClipboard(user?.uid)}>
                Copiar UID
              </Button>
            </div>
          )}
        </section>
        
        <section>
          <h3 className="font-semibold text-lg mb-2">5. Instala las dependencias y ejecuta el script</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Vuelve a la terminal de Cloud Shell (no al editor) y ejecuta estos dos comandos, uno por uno:
          </p>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Comando 1:</p>
              <code className="block w-full rounded bg-muted p-3 font-mono text-sm">npm install firebase-admin</code>
              <Button variant="outline" size="sm" className="mt-1" onClick={() => handleCopyToClipboard('npm install firebase-admin')}>Copiar</Button>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Comando 2:</p>
              <code className="block w-full rounded bg-muted p-3 font-mono text-sm">node set-admin.js</code>
              <Button variant="outline" size="sm" className="mt-1" onClick={() => handleCopyToClipboard('node set-admin.js')}>Copiar</Button>
            </div>
          </div>
        </section>
        
        <section>
          <h3 className="font-semibold text-lg mb-2 flex items-center gap-2 text-green-500">
            <CheckCircle />
            ¡Listo! Cierra y vuelve a iniciar sesión
          </h3>
          <p className="text-sm text-muted-foreground">
            Si el script se ejecutó con éxito, cierra la sesión en SquadUp y vuelve a entrar para que tus nuevos permisos de administrador se apliquen.
          </p>
        </section>
      </div>
    </div>
  );
}
