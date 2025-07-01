import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Permission denied: No token.' }, { status: 401 });
    }

    const idToken = authorization.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const callerUid = decodedToken.uid;

    const { uid, role } = await request.json();
    const validRoles = ['admin', 'moderator', 'founder', 'coach', 'player'];

    if (!uid || !role || !validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid arguments.' }, { status: 400 });
    }

    // Special case for the "Make Admin" tool: a user can make themselves an admin.
    const isSelfAssigningAdmin = (callerUid === uid && role === 'admin');

    // Regular case: only an existing admin can assign roles.
    if (decodedToken.role !== 'admin' && !isSelfAssigningAdmin) {
      return NextResponse.json({ error: 'Permission denied: Not an admin.' }, { status: 403 });
    }

    const userToUpdate = await adminAuth.getUser(uid);
    const existingClaims = userToUpdate.customClaims || {};

    await adminAuth.setCustomUserClaims(uid, { ...existingClaims, role });
    await adminDb.collection('users').doc(uid).set({ role }, { merge: true });

    return NextResponse.json({ message: `Role "${role}" assigned to user ${uid}` });
  } catch (error: any) {
    console.error('❌ Error assigning role:', error);
    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json({ error: 'Token expired.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
