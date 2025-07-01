'use client';

import { auth } from "@/lib/firebase/client";

export async function setUserRole(uid: string, role: string) {
    const user = auth.currentUser;
    if (!user) {
        throw new Error("You must be logged in to perform this action.");
    }
    
    const token = await user.getIdToken();

    const response = await fetch('/api/assign-role', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ uid, role }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Failed to set user role.');
    }

    return data;
}
