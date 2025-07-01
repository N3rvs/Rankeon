
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

const scriptContent = `const admin = require('firebase-admin');

// En Cloud Shell, la autenticación es automática. ¡No se necesita un archivo de clave!
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

// --- ¡IMPORTANTE! ---
// Reemplaza la siguiente línea con tu UID real, que puedes copiar de esta página.
const uid = 'AQUÍ_TU_UID';
// --------------------

if (uid === 'AQUÍ_TU_UID' || !uid) {
  console.error('❌ ERROR: Reemplaza el texto "AQUÍ_TU_UID" en el script con tu User ID real antes de ejecutar.');
  process.exit(1);
}

admin
  .auth()
  .setCustomUserClaims(uid, { role: 'admin' })
  .then(() => {
    console.log(\`✅ ¡Éxito! Se asignó el rol "admin" al usuario con UID: \${uid}\`);
    console.log('🎉 Cierra sesión y vuelve a iniciarla en la app para ver los cambios.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error al asignar el rol:', error);
    if (error.code === 'auth/user-not-found') {
        console.error('🤔 Pista: El UID que proporcionaste no existe. ¿Lo copiaste correctamente?');
    }
    process.exit(1);
  });
`;

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

  return (
    <div className="space-y-6">
      <Card className="max-w-3xl mx-auto">
        <CardHeader className="text-center">
          <FileCode className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="font-headline">
            Solución Definitiva: Script de Administrador
          </CardTitle>
          <CardDescription>
            Los métodos anteriores fallaron. Usemos la forma más fiable: un script directo en Google Cloud.
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
              Copia el siguiente código. En Cloud Shell, abre el editor (icono de lápiz), crea un archivo llamado <strong>set-admin.js</strong> y pega el código.
            </p>
             <div className="p-4 bg-muted rounded-lg ml-10">
                <pre className="whitespace-pre-wrap text-sm font-mono">
                 <code>{scriptContent}</code>
                </pre>
             </div>
             <Button variant="outline" size="sm" className="mt-2 ml-10" onClick={() => handleCopyToClipboard(scriptContent)}>
                  Copiar script
             </Button>
          </div>

          <div>
             <h3 className="font-semibold mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">3</span>
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
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">4</span>
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
