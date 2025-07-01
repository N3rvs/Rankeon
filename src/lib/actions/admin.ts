'use server';

import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env') });

import { getAdminInstances } from '@/lib/firebase/admin';

export async function grantFirstAdminRole(
  token: string
): Promise<{ success: boolean; message: string }> {
  if (!token) {
    return { success: false, message: 'Authentication token is missing.' };
  }

  try {
    const { adminAuth, adminDb } = getAdminInstances();

    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const listUsersResult = await adminAuth.listUsers(1000);
    const existingAdmin = listUsersResult.users.find(
      (user) => user.customClaims?.role === 'admin'
    );

    if (existingAdmin) {
      return {
        success: false,
        message: 'Ya existe un usuario administrador. Esta acción solo se puede realizar una vez.',
      };
    }

    await adminAuth.setCustomUserClaims(uid, { role: 'admin' });

    await adminDb.collection('users').doc(uid).set({ role: 'admin' }, { merge: true });

    return {
      success: true,
      message: 'Rol de administrador asignado. Por favor, cierra sesión y vuelve a iniciar sesión para aplicar los cambios.',
    };
  } catch (error: any) {
    console.error('Error in grantFirstAdminRole:', error);
    return {
      success: false,
      message: `Ocurrió un error inesperado: ${error.message}`,
    };
  }
}
