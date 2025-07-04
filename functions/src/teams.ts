
// functions/src/teams.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface CreateTeamData {
  name: string;
  game: string;
  description?: string;
}

export const createTeam = onCall(async ({ auth, data }: { auth?: any, data: CreateTeamData }) => {
  const uid = auth?.uid;
  const { name, game, description } = data;

  if (!uid) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión para crear un equipo.");
  }
  if (!name || !game) {
    throw new HttpsError("invalid-argument", "El nombre del equipo y el juego son obligatorios.");
  }

  // This is the most robust check. It looks at the custom claims on the user's auth token.
  if (auth?.token.role === 'founder') {
    throw new HttpsError('already-exists', 'Solo puedes ser fundador de un equipo. Borra tu equipo actual si deseas crear uno nuevo.');
  }

  const teamRef = db.collection("teams").doc();
  const userRef = db.collection("users").doc(uid);

  try {
    await db.runTransaction(async (transaction) => {
      // First, read the user's current role from Firestore inside the transaction
      // This is the ultimate guard against race conditions.
      const userDoc = await transaction.get(userRef);
      if (userDoc.data()?.role === 'founder') {
        throw new HttpsError('already-exists', 'Ya eres fundador de otro equipo.');
      }
      
      // Set the team document
      transaction.set(teamRef, {
        id: teamRef.id,
        name,
        game,
        description: description || '',
        avatarUrl: `https://placehold.co/100x100.png?text=${name.slice(0,2)}`,
        bannerUrl: 'https://placehold.co/1200x400.png',
        founder: uid,
        memberIds: [uid],
        lookingForPlayers: false,
        recruitingRoles: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Set the member subcollection document
      const memberRef = teamRef.collection("members").doc(uid);
      transaction.set(memberRef, {
        role: "founder",
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      // Update the user's role in their Firestore document
      transaction.update(userRef, { role: 'founder' });
    });

    // After the transaction succeeds, update the custom claims
    const userToUpdate = await admin.auth().getUser(uid);
    const existingClaims = userToUpdate.customClaims || {};
    await admin.auth().setCustomUserClaims(uid, { ...existingClaims, role: 'founder' });

    return { success: true, teamId: teamRef.id, message: '¡Equipo creado con éxito!' };
  } catch (error: any) {
    console.error("Error creating team:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Ocurrió un error inesperado al crear el equipo.');
  }
});
