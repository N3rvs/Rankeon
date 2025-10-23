import { LoginForm } from '@/components/auth/login-form';
import { Gamepad2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { Metadata } from 'next';
import Image from 'next/image';
import Login from '../../assets/login.png';

export const metadata: Metadata = {
  title: 'Login',
};

export default function LoginPage() {
  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
      <div className="relative hidden flex-col items-center justify-center bg-gray-900 text-white lg:flex">
        <Image
          src={'/login.png'}
          alt="Gaming background"
          fill
          className="absolute inset-0 object-cover"
          data-ai-hint="esports gamer"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent opacity-90" />
        <div className="relative z-10 text-center max-w-sm">
          <h1 className="text-4xl font-bold font-headline">
            Forja tu leyenda en Rankeon
          </h1>
        </div>
      </div>
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-md space-y-6">
          <div className="flex flex-col items-center justify-center text-center">
            <Gamepad2 className="h-12 w-12 text-primary" />
            <h1 className="text-3xl font-bold font-headline mt-4">
              Welcome Back
            </h1>
            <p className="text-muted-foreground">
              Sign in to continue to your dashboard.
            </p>
          </div>
          <LoginForm />
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
