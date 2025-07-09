import { RegisterForm } from '@/components/auth/register-form';
import { Button } from '@/components/ui/button';
import { Gamepad2 } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Register',
};

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="absolute top-4 left-4">
            <Button variant="ghost" asChild>
                <Link href="/">&larr; Back to Home</Link>
            </Button>
        </div>
        <div className="w-full max-w-md">
             <div className="flex flex-col items-center justify-center mb-8">
                <Gamepad2 className="h-12 w-12 text-primary" />
                <h1 className="text-3xl font-bold font-headline mt-4">Create your Rankeon Account</h1>
                <p className="text-muted-foreground">Join the community and find your team.</p>
            </div>
            <RegisterForm />
        </div>
    </div>
  );
}
