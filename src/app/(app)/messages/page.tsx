// This file is no longer needed and can be deleted.
// The new chat functionality is handled through modals.
import { redirect } from 'next/navigation';

export default function MessagesPage() {
    redirect('/dashboard');
}
