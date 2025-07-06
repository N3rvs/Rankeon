'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/navigation';
import { ArrowLeft, Ticket } from 'lucide-react';

export default function ModeratorTicketsPage() {
  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild>
        <Link href="/moderator">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Moderator Panel
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline">
            <Ticket /> Support Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>This page is under construction.</p>
        </CardContent>
      </Card>
    </div>
  );
}
