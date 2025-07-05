'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This tool has been removed to simplify the admin setup process.
// Admins can be designated directly in the Firebase console for initial setup.
export default function MakeAdminPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/admin');
    }, [router]);

    return null;
}
