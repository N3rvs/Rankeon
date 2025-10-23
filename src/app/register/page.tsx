import { RegisterForm } from '@/components/auth/register-form';
import { Gamepad2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Register',
};

export default function RegisterPage() {
  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
      <div className="relative hidden flex-col items-center justify-center bg-gray-900 text-white lg:flex">
        <Image
          src="https://picsum.photos/seed/register-esports/1200/1800"
          alt="Esports team planning strategy"
          fill
          className="absolute inset-0 object-cover opacity-30"
          data-ai-hint="esports team planning"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <div className="relative z-10 text-center max-w-sm">
          <h1 className="text-4xl font-bold font-headline">
            Construye tu legado.
          </h1>
          <p className="text-lg text-white/80 mt-2">
            Registra tu cuenta y empieza tu camino hacia la cima.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-md space-y-6">
          <div className="flex flex-col items-center justify-center text-center">
            <Gamepad2 className="h-12 w-12 text-primary" />
            <h1 className="text-3xl font-bold font-headline mt-4">
              Create your Rankeon Account
            </h1>
            <p className="text-muted-foreground">
              Join the community and find your team.
            </p>
          </div>
          <RegisterForm />
          <div className="text-center">
            <Button variant="link" asChild className="text-sm">
              <Link href="/">&larr; Back to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
