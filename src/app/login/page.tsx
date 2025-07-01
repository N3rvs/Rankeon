import { LoginForm } from '@/components/auth/login-form';
import { Users } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="absolute top-4 left-4">
            <Button variant="ghost" asChild>
                <Link href="/">&larr; Back to Home</Link>
            </Button>
        </div>
       <div className="w-full max-w-md">
            <div className="flex flex-col items-center justify-center mb-8">
                <Users className="h-12 w-12 text-primary" />
                <h1 className="text-3xl font-bold font-headline mt-4">Welcome Back to SquadUp</h1>
                <p className="text-muted-foreground">Sign in to continue to your dashboard.</p>
            </div>
            <LoginForm />
        </div>
    </div>
  );
}
