'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase/client';

const functions = getFunctions(app);

export async function grantFirstAdminRole(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const func = httpsCallable(functions, 'grantFirstAdminRole');
    const result = await func();
    return (result.data as { success: boolean; message: string });
  } catch (error: any) {
    console.error('Error granting first admin role:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred.',
    };
  }
}
