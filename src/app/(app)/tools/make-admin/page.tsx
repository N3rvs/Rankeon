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
import { useState } from 'react';

export default function MakeAdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const handleMakeAdmin = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to perform this action.',
        variant: 'destructive',
      });
      return;
    }

    setIsPending(true);

    try {
      const res = await fetch('/api/admin/assign-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid: user.uid }),
      });
      
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await res.text();
        console.error("Raw response from server:", responseText);
        toast({
          title: 'Server Error',
          description: 'Invalid JSON response from server. The server might have crashed.',
          variant: 'destructive',
        });
        return;
      }
      
      const result = await res.json();

      if (!res.ok) {
        // Use toast to display the error from the server, don't throw
        toast({
          title: 'Error',
          description: result.message || 'An unknown error occurred on the server.',
          variant: 'destructive',
        });
      } else {
         toast({
          title: 'Success!',
          description: `${result.message}. Please log out and log back in.`,
        });
      }

    } catch (error: any) {
      console.error('❌ Grant admin role failed:', error);
      toast({
        title: 'Request Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsPending(false);
    }
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
