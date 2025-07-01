'use client';

import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Shield } from 'lucide-react';
import { useTransition } from 'react';
import { grantAdminRole } from '@/lib/actions/admin';

export default function MakeAdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleMakeAdmin = () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to perform this action.',
        variant: 'destructive',
      });
      return;
    }

    startTransition(async () => {
      try {
        const result = await grantAdminRole({ uid: user.uid });

        if (result.success) {
          toast({
            title: 'Success!',
            description: `${result.message}. Please log out and log back in.`,
          });
        } else {
          throw new Error(result.message);
        }
      } catch (error: any) {
        console.error('❌ Grant admin role failed:', error);
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <Shield className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="font-headline">Grant Admin Privileges</CardTitle>
          <CardDescription>
            Click the button below to assign the <strong>admin</strong> role to your currently logged-in account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Your User ID:{' '}
              <code className="bg-muted px-1 py-0.5 rounded">{user?.uid ?? 'Loading...'}</code>
            </p>
            <Button onClick={handleMakeAdmin} disabled={isPending || !user}>
              {isPending ? 'Assigning Role...' : 'Make Me Admin'}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              After clicking, you must log out and log back in for the new role to take effect.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
