'use server';

import { z } from 'zod';
import { getAdminInstances } from '@/lib/firebase/admin';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';

const CreateTeamSchema = z.object({
  name: z.string().min(3, { message: 'Team name must be at least 3 characters.' }).max(50),
  game: z.string().min(1, { message: 'Please select a game.' }),
  description: z.string().max(300).optional(),
});

type ActionResponse = {
  success: boolean;
  message: string;
  teamId?: string;
};

export async function createTeam(
  values: z.infer<typeof CreateTeamSchema>,
  token: string | null
): Promise<ActionResponse> {
  if (!token) {
    return { success: false, message: 'Authentication token is missing.' };
  }

  const { adminAuth, adminDb } = getAdminInstances();
  
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;
    
    const validatedFields = CreateTeamSchema.safeParse(values);

    if (!validatedFields.success) {
      return { success: false, message: 'Invalid form data.' };
    }
    
    const { name, game, description } = validatedFields.data;

    const userDoc = await adminDb.collection('users').doc(uid).get();
    const userProfile = userDoc.data();

    if (!userProfile) {
      return { success: false, message: 'User profile not found.' };
    }

    const allowedRoles = ['admin', 'moderator', 'founder'];
    if (!allowedRoles.includes(userProfile.role)) {
      return { success: false, message: 'You do not have permission to create a team.' };
    }
    
    const newTeamRef = adminDb.collection('teams').doc();
    
    await newTeamRef.set({
      id: newTeamRef.id,
      name,
      game,
      description: description || '',
      avatarUrl: `https://placehold.co/100x100.png`,
      ownerId: uid,
      memberIds: [uid],
      lookingForPlayers: false,
      recruitingRoles: [],
      createdAt: FieldValue.serverTimestamp(),
    });

    revalidatePath('/teams');

    return { success: true, message: 'Team created successfully!', teamId: newTeamRef.id };
  } catch (error: any) {
    console.error('Error creating team:', error);
    if (error.code === 'auth/id-token-expired') {
        return { success: false, message: 'Session expired. Please log in again.' };
    }
    return { success: false, message: 'Failed to create team. Please try again.' };
  }
}
