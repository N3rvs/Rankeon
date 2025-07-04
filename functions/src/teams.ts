
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

  const teamRef = await db.collection("teams").add({
    name,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    founder: uid,
  });

  await teamRef.collection("members").doc(uid).set({
    role: "founder",
    joinedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, teamId: teamRef.id };
});

export const acceptTeamInvitation = onCall(async ({ auth, data }: { auth?: any, data: AcceptTeamInvitationData }) => {
  const uid = auth?.uid;
  const { teamId } = data;

  if (!uid) throw new HttpsError("unauthenticated", "You must be logged in.");
  if (!teamId) throw new HttpsError("invalid-argument", "Missing team ID.");

  const teamRef = db.collection("teams").doc(teamId);
  const teamDoc = await teamRef.get();

  if (!teamDoc.exists) throw new HttpsError("not-found", "Team not found.");

  const invitationRef = teamRef.collection("invitations").doc(uid);
  const invitationDoc = await invitationRef.get();

  if (!invitationDoc.exists) {
    throw new HttpsError("failed-precondition", "No invitation found.");
  }

  await Promise.all([
    invitationRef.delete(),
    teamRef.collection("members").doc(uid).set({
      role: "member",
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
    }),
  ]);

  return { success: true };
});

export const kickUserFromTeam = onCall(async ({ auth, data }: { auth?: any, data: KickUserData }) => {
  const uid = auth?.uid;
  const { teamId, targetUid } = data;

  if (!uid || !teamId || !targetUid) {
    throw new HttpsError("invalid-argument", "Missing team ID or target UID.");
  }

  const memberRef = db.doc(`teams/${teamId}/members/${uid}`);
  const memberSnap = await memberRef.get();
  const role = memberSnap.data()?.role;

  if (role !== 'founder') {
    throw new HttpsError("permission-denied", "Only the founder can kick members.");
  }

  if (uid === targetUid) {
    throw new HttpsError("invalid-argument", "You can't kick yourself.");
  }

  await db.doc(`teams/${teamId}/members/${targetUid}`).delete();
  return { success: true };
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
