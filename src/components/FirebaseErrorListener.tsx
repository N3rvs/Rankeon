'use client';
import { useEffect } from 'react';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { FirestorePermissionError } from '@/lib/firebase/errors';

// This component listens for Firestore permission errors and logs them
// as uncaught exceptions, which will be displayed by the Next.js dev overlay.
export function FirebaseErrorListener() {
  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      // Throwing the error here makes it uncaught, which Next.js will
      // then display in its development error overlay. This is exactly
      // what we want for providing rich, debuggable context.
      throw error;
    };

    errorEmitter.on('permission-error', handlePermissionError);

    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, []);

  return null; // This component does not render anything.
}
