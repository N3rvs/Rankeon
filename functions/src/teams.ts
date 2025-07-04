// 📁 functions/teams.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface AcceptTeamInvitationData {
  teamId: string;
}

interface ManageRoleData {
  teamId: string;
  targetUid: string;
  newRole: 'member' | 'coach' | 'founder';
}

interface KickUserData {
  teamId: string;
  targetUid: string;
}

interface CreateTeamData {
  name: string;
  game: string;
  description?: string;
}

export const createTeam = onCall(async ({ auth, data }: { auth?: any, data: CreateTeamData }) => {
  const uid = auth?.uid;
  const { name, game, description } = data;

  if (!uid) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }
  if (!name || !game) {
    throw new HttpsError("invalid-argument", "Team name and game are required.");
  }

  // Check if user already founded a team
  const existingTeamQuery = db.collection('teams').where('founder', '==', uid).limit(1);
  const existingTeamSnap = await existingTeamQuery.get();
  if (!existingTeamSnap.empty) {
    throw new HttpsError('already-exists', 'You can only be the founder of one team. Please delete your existing team if you wish to create a new one.');
  }

  const teamRef = db.collection("teams").doc();
  const userRef = db.collection('users').doc(uid);

  await db.runTransaction(async (transaction) => {
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

    const memberRef = teamRef.collection("members").doc(uid);
    transaction.set(memberRef, {
      role: "founder",
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update the user's global role to 'founder'
    transaction.update(userRef, { role: 'founder' });
  });

  return { success: true, teamId: teamRef.id, message: 'Team created successfully!' };
});

export const deleteTeam = onCall(async ({ auth, data }: { auth?: any, data: { teamId: string } }) => {
    const uid = auth?.uid;
    const { teamId } = data;

    if (!uid || !teamId) {
        throw new HttpsError("invalid-argument", "Missing authentication or team ID.");
    }

    const teamRef = db.collection("teams").doc(teamId);
    
    return db.runTransaction(async (transaction) => {
        const teamDoc = await transaction.get(teamRef);
        if (!teamDoc.exists) {
            throw new HttpsError("not-found", "Team not found.");
        }
        const teamData = teamDoc.data();
        if (teamData?.founder !== uid) {
            throw new HttpsError("permission-denied", "Only the team founder can delete the team.");
        }

        // Delete all members in the subcollection. This is not transactional for the read, but the deletes are.
        const membersRef = teamRef.collection("members");
        const membersSnapshot = await membersRef.get();
        membersSnapshot.forEach(doc => transaction.delete(doc.ref));

        // TODO: In a real app, delete other subcollections like 'invitations', 'scrims' chats, etc.

        // Delete the main team document
        transaction.delete(teamRef);

        // Revert the user's role to 'player'
        const userRef = db.collection('users').doc(uid);
        transaction.update(userRef, { role: 'player' });

        return { success: true, message: "Team deleted successfully." };
    });
});

export const acceptTeamInvitation = onCall(async ({ auth, data }: { auth?: any, data: AcceptTeamInvitationData }) => {
  const uid = auth?.uid;
  const { teamId } = data;

  if (!uid) throw new HttpsError("unauthenticated", "You must be logged in.");
  if (!teamId) throw new HttpsError("invalid-argument", "Missing team ID.");

  const teamRef = db.collection("teams").doc(teamId);
  const invitationRef = teamRef.collection("invitations").doc(uid);
  const memberRef = teamRef.collection("members").doc(uid);

  return db.runTransaction(async (transaction) => {
    const teamDoc = await transaction.get(teamRef);
    if (!teamDoc.exists) throw new HttpsError("not-found", "Team not found.");

    const invitationDoc = await transaction.get(invitationRef);
    if (!invitationDoc.exists) {
      throw new HttpsError("failed-precondition", "No invitation found.");
    }
    
    transaction.delete(invitationRef);
    transaction.set(memberRef, {
      role: "member",
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    transaction.update(teamRef, {
      memberIds: admin.firestore.FieldValue.arrayUnion(uid)
    });
  });
});

export const kickUserFromTeam = onCall(async ({ auth, data }: { auth?: any, data: KickUserData }) => {
  const uid = auth?.uid;
  const { teamId, targetUid } = data;

  if (!uid || !teamId || !targetUid) {
    throw new HttpsError("invalid-argument", "Missing team ID or target UID.");
  }
  if (uid === targetUid) {
    throw new HttpsError("invalid-argument", "You can't kick yourself.");
  }

  const teamRef = db.collection("teams").doc(teamId);
  const memberRef = teamRef.collection("members").doc(uid);
  const targetMemberRef = teamRef.collection("members").doc(targetUid);
  
  return db.runTransaction(async (transaction) => {
    const memberSnap = await transaction.get(memberRef);
    const memberRole = memberSnap.data()?.role;

    if (memberRole !== 'founder') {
      throw new HttpsError("permission-denied", "Only the founder can kick members.");
    }
    
    transaction.delete(targetMemberRef);
    transaction.update(teamRef, {
      memberIds: admin.firestore.FieldValue.arrayRemove(targetUid)
    });
  });
});

export const changeUserRole = onCall(async ({ auth, data }: { auth?: any, data: ManageRoleData }) => {
  const uid = auth?.uid;
  const { teamId, targetUid, newRole } = data;

  if (!uid || !teamId || !targetUid || !newRole) {
    throw new HttpsError("invalid-argument", "Missing required fields.");
  }

  const requesterRef = db.doc(`teams/${teamId}/members/${uid}`);
  const requesterSnap = await requesterRef.get();
  const requesterRole = requesterSnap.data()?.role;

  if (!['coach', 'founder'].includes(requesterRole)) {
    throw new HttpsError("permission-denied", "Only coaches or founders can change roles.");
  }

  if (requesterRole === 'coach' && newRole === 'founder') {
    throw new HttpsError("permission-denied", "Coaches cannot assign founder role.");
  }

  await db.doc(`teams/${teamId}/members/${targetUid}`).update({
    role: newRole,
  });

  return { success: true };
});
