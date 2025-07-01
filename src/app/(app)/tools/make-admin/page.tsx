'use client';

import { grantAdminRole } from '@/ai/flows/grant-admin-flow';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Shield } from 'lucide-react';
import { useState } from 'react';

export default function MakeAdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleMakeAdmin = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await grantAdminRole({ uid: user.uid });
      toast({
        title: 'Success!',
        description: `${result.message}. Please log out and log back in for the changes to take effect.`,
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'Failed to grant admin role. Check the server logs.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
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
            <Button onClick={handleMakeAdmin} disabled={isLoading || !user}>
              {isLoading ? 'Assigning Role...' : 'Make Me Admin'}
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
