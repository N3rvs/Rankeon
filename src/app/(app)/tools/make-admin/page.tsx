'use client';

import { grantAdminRole } from '@/lib/actions/admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Shield } from 'lucide-react';
import { useTransition } from 'react';

export default function MakeAdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleMakeAdmin = () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in.',
        variant: 'destructive',
      });
      return;
    }

    startTransition(() => {
      grantAdminRole({ uid: user.uid })
        .then((result) => {
          toast({
            title: 'Success!',
            description: `${result.message}. Please log out and log back in for the changes to take effect.`,
          });
        })
        .catch((error: any) => {
          console.error(error);
          toast({
            title: 'Error',
            description: 'Failed to grant admin role. Check the server logs.',
            variant: 'destructive',
          });
        });
    });
  };

  return (
    <div className="space-y-6">
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <Shield className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="font-headline">Grant Admin Privileges</CardTitle>
          <CardDescription>
            Click the button below to assign the 'admin' role to your currently logged-in account.
            This is a one-time setup action.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Your User ID: <code className="bg-muted px-1 py-0.5 rounded">{user?.uid ?? 'Loading...'}</code>
            </p>
            <Button onClick={handleMakeAdmin} disabled={isPending || !user}>
              {isPending ? 'Assigning Role...' : 'Make Me Admin'}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              After clicking, you must log out and log back in for the new role to be applied to your session.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}