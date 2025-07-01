import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get('authorization'); // ✅ ← este es el correcto
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Permission denied: No token.' }, { status: 401 });
    }

    const idToken = authorization.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // Solo permite que un admin ya existente asigne roles
    if (decodedToken.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied: Not an admin.' }, { status: 403 });
    }

    const { uid, role } = await request.json();
    const validRoles = ['admin', 'moderator', 'founder', 'coach', 'player'];

    if (!uid || !role || !validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid arguments.' }, { status: 400 });
    }

    const user = await adminAuth.getUser(uid);
    const existingClaims = user.customClaims || {};

    await adminAuth.setCustomUserClaims(uid, { ...existingClaims, role });
    await adminDb.collection('users').doc(uid).set({ role }, { merge: true });

    return NextResponse.json({ message: `Role "${role}" assigned to ${uid}` });
  } catch (error: any) {
    console.error('❌ Error assigning role:', error);
    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json({ error: 'Token expired.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
