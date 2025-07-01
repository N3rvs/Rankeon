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
import { ShieldCheck, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function MakeAdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const copyToClipboard = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      toast({
        title: '¡Copiado!',
        description: 'Tu ID de usuario ha sido copiado al portapapeles.',
      });
    }
  };

  const firebaseConsoleUrl = `https://console.firebase.google.com/project/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/authentication/users`;

  return (
    <div className="space-y-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="font-headline">Configura tu Cuenta de Administrador</CardTitle>
          <CardDescription>
            Sigue estos pasos en la Consola de Firebase para asignar de forma segura el rol de
            <strong> administrador </strong>
            a tu cuenta. Es una configuración única.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Tu ID de Usuario (UID)</label>
            <div className="flex items-center gap-2">
              <code className="bg-muted px-2 py-1 rounded w-full overflow-x-auto">
                {user?.uid ?? 'Cargando...'}
              </code>
              <Button variant="outline" size="icon" onClick={copyToClipboard} disabled={!user?.uid}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="prose prose-sm prose-invert max-w-none text-muted-foreground">
            <ol className="list-decimal list-inside space-y-4">
              <li>
                Abre la página de Autenticación de la Consola de Firebase para tu proyecto.
                <Button variant="link" asChild className="p-1 h-auto">
                  <Link href={firebaseConsoleUrl} target="_blank" rel="noopener noreferrer">
                    Abrir Consola de Firebase
                  </Link>
                </Button>
              </li>
              <li>Busca el usuario con el UID que se muestra arriba y haz clic en el menú de tres puntos a la derecha.</li>
              <li>Selecciona <strong>"Editar usuario"</strong>.</li>
              <li>En el cuadro de diálogo, haz clic en <strong>"Añadir atributo personalizado"</strong>.</li>
              <li>
                Introduce <code className="bg-muted px-1 py-0.5 rounded">role</code> para la Clave (Key) y
                <code className="bg-muted px-1 py-0.5 rounded">admin</code> para el Valor (Value).
              </li>
              <li>Haz clic en <strong>"Añadir"</strong> y luego en <strong>"Guardar"</strong>.</li>
              <li>
                Para aplicar los cambios, <strong>cierra sesión</strong> en esta aplicación y
                <strong> vuelve a iniciar sesión</strong>.
              </li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
