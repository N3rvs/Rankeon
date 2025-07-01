// src/app/(app)/inbox/page.tsx
import { redirect } from 'next/navigation';

export default function InboxPage() {
  // The primary inbox is now the popover. Redirect to dashboard.
  redirect('/dashboard');
  return null;
}
