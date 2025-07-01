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
        title: 'Copied!',
        description: 'Your User ID has been copied to the clipboard.',
      });
    }
  };

  const firebaseConsoleUrl = `https://console.firebase.google.com/project/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/authentication/users`;

  return (
    <div className="space-y-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="font-headline">Set Up Your Admin Account</CardTitle>
          <CardDescription>
            Follow these steps in the Firebase Console to securely assign the
            <strong> admin </strong>
            role to your account. This is a one-time setup.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Your User ID (UID)</label>
            <div className="flex items-center gap-2">
              <code className="bg-muted px-2 py-1 rounded w-full overflow-x-auto">
                {user?.uid ?? 'Loading...'}
              </code>
              <Button variant="outline" size="icon" onClick={copyToClipboard} disabled={!user?.uid}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="prose prose-sm prose-invert max-w-none text-muted-foreground">
            <ol className="list-decimal list-inside space-y-4">
              <li>
                Open the Firebase Console Authentication page for your project.
                <Button variant="link" asChild className="p-1 h-auto">
                  <Link href={firebaseConsoleUrl} target="_blank" rel="noopener noreferrer">
                    Open Firebase Console
                  </Link>
                </Button>
              </li>
              <li>Find the user with the UID shown above and click the three-dot menu on the right.</li>
              <li>Select <strong>"Edit user"</strong>.</li>
              <li>In the dialog, click <strong>"Add custom claim"</strong>.</li>
              <li>
                Enter <code className="bg-muted px-1 py-0.5 rounded">role</code> for the Key and
                <code className="bg-muted px-1 py-0.5 rounded">admin</code> for the Value.
              </li>
              <li>Click <strong>"Add"</strong> and then <strong>"Save"</strong>.</li>
              <li>
                To apply the changes, <strong>log out</strong> of this application and
                <strong> log back in</strong>.
              </li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
