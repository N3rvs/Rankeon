'use server';
import { getAdminInstances } from '@/lib/firebase/admin';

export async function grantFirstAdminRole(
  token: string
): Promise<{ success: boolean; message: string }> {
  if (!token) {
    return { success: false, message: 'Authentication token is missing.' };
  }

  try {
    const { adminAuth, adminDb } = getAdminInstances();

    // 1. Verify the token to get the user's UID securely
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // 2. Check if any admins already exist (Security Check)
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

    // 3. Set the custom claim
    await adminAuth.setCustomUserClaims(uid, { role: 'admin' });

    // 4. Also update Firestore document for consistency
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
