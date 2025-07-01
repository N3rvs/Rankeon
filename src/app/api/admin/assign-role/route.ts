import { NextResponse } from 'next/server';
import { getAdminInstances } from '@/lib/firebase/admin';

export async function POST(request: Request) {
  try {
    const { uid } = await request.json();

    if (!uid) {
      return NextResponse.json(
        { success: false, message: 'User ID is required.' },
        { status: 400 }
      );
    }
    
    const { adminAuth, adminDb } = getAdminInstances();
    // Ensure the user exists before trying to set claims
    await adminAuth.getUser(uid);
    
    await adminAuth.setCustomUserClaims(uid, { role: 'admin' });
    await adminDb.collection('users').doc(uid).set({ role: 'admin' }, { merge: true });
    
    return NextResponse.json({
      success: true,
      message: `Admin role successfully assigned to user ${uid}.`,
    });

  } catch (error: any) {
    console.error('❌ Error in /api/admin/assign-role:', error);
    return NextResponse.json(
        { success: false, message: `Failed to assign admin role: ${error.message}` },
        { status: 500 }
    );
  }
}
