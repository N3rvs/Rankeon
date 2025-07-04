'use client';

import { useState, useTransition } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { grantFirstAdminRole } from '@/lib/actions/admin';
import { KeyRound, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function MakeAdminPage() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleGrantAdmin = () => {
    startTransition(async () => {
      const res = await grantFirstAdminRole();
      setResult(res);
      if (res.success) {
        toast({
          title: 'Success!',
          description: res.message,
        });
      } else {
        toast({
          title: 'Error',
          description: res.message,
          variant: 'destructive',
        });
      }
    });
  };

  if (!user || !userProfile) {
    return (
      <div className="flex justify-center items-center h-full">
        <p>Loading user data...</p>
      </div>
    );
  }
  
  if (userProfile.role === 'admin') {
      return (
           <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl">You Are Already an Admin</CardTitle>
                <CardDescription>This tool is for initial setup. You already have full admin privileges.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4 bg-primary/10 p-4 rounded-lg border border-primary/20">
                    <CheckCircle className="h-8 w-8 text-primary" />
                    <p className="text-primary/90">You can now access the <Link href="/admin" className="font-bold underline hover:text-primary">Admin Dashboard</Link>.</p>
                </div>
            </CardContent>
        </Card>
      )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <KeyRound className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="font-headline text-2xl">
                Become the First Administrator
              </CardTitle>
              <CardDescription>
                This is a one-time action to claim admin rights for the app.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            This tool assigns the 'admin' role to your user account, but only if
            no other administrators exist. This ensures that the first person to
            set up the app can manage it.
          </p>
          <div className="bg-muted p-4 rounded-lg text-sm text-muted-foreground">
            <p><strong>Your User ID:</strong> {user.uid}</p>
            <p>Once you become an admin, you can manage users and other app settings from the Admin Dashboard.</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleGrantAdmin}
            disabled={isPending}
            className="w-full"
          >
            {isPending ? 'Processing...' : 'Grant Admin Privileges'}
          </Button>
        </CardFooter>
      </Card>

      {result && (
        <Alert variant={result.success ? 'default' : 'destructive'}>
          {result.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <AlertTitle>{result.success ? 'Success!' : 'Error'}</AlertTitle>
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
