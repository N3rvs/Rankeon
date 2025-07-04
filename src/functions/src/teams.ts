
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
}

export const createTeam = onCall(async ({ auth, data }: { auth?: any, data: CreateTeamData }) => {
  const uid = auth?.uid;
  const { name } = data;

  if (!uid) throw new HttpsError("unauthenticated", "You must be logged in.");
  if (!name) throw new HttpsError("invalid-argument", "Team name is required.");

  const teamRef = db.collection("teams").doc();

  await db.runTransaction(async (transaction) => {
    // 1. Create the team document
    transaction.set(teamRef, {
      id: teamRef.id,
      name,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      founder: uid,
      memberIds: [uid], // Add the founder to the memberIds array
      avatarUrl: `https://placehold.co/100x100.png?text=${name.charAt(0)}`,
    });

    // 2. Create the member subdocument for the founder
    const memberRef = teamRef.collection("members").doc(uid);
    transaction.set(memberRef, {
      role: "founder",
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return { success: true, teamId: teamRef.id };
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
    
    // Perform all writes in the transaction
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
    
    // Perform all writes in the transaction
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