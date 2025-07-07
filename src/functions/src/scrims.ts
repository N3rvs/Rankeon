
// src/functions/scrims.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();
const Timestamp = admin.firestore.Timestamp;

const STAFF_ROLES = ['founder', 'coach', 'admin'];

interface CreateScrimData {
    teamId: string;
    date: string; // ISO string
    format: 'bo1' | 'bo3' | 'bo5';
    type: 'scrim' | 'tryout';
    notes?: string;
    rankMin?: string;
    rankMax?: string;
}

export const createScrim = onCall(async ({ auth, data }: { auth?: any, data: CreateScrimData }) => {
    const uid = auth?.uid;
    const { teamId, date, format, type, notes, rankMin, rankMax } = data;

    if (!uid) throw new HttpsError("unauthenticated", "You must be logged in.");
    if (!teamId || !date || !format || !type) {
        throw new HttpsError("invalid-argument", "Missing required scrim details.");
    }

    const teamRef = db.collection("teams").doc(teamId);
    const memberRef = teamRef.collection("members").doc(uid);
    
    const [teamSnap, memberSnap] = await Promise.all([teamRef.get(), memberRef.get()]);

    if (!teamSnap.exists) throw new HttpsError("not-found", "Team not found.");
    if (!memberSnap.exists || !STAFF_ROLES.includes(memberSnap.data()?.role)) {
        throw new HttpsError("permission-denied", "You must be staff to create a scrim for this team.");
    }

    const teamData = teamSnap.data()!;
    const scrimRef = db.collection("scrims").doc();

    await scrimRef.set({
        id: scrimRef.id,
        teamAId: teamId,
        teamAName: teamData.name,
        teamAAvatarUrl: teamData.avatarUrl,
        country: teamData.country || '',
        date: Timestamp.fromDate(new Date(date)),
        format,
        type,
        notes: notes || '',
        status: "pending",
        createdAt: Timestamp.now(),
        rankMin: rankMin || '',
        rankMax: rankMax || '',
    });

    return { success: true, scrimId: scrimRef.id };
});

interface AcceptScrimData {
    scrimId: string;
    acceptingTeamId: string;
}

export const acceptScrim = onCall(async ({ auth, data }: { auth?: any, data: AcceptScrimData }) => {
    const uid = auth?.uid;
    const { scrimId, acceptingTeamId } = data;

    if (!uid) throw new HttpsError("unauthenticated", "You must be logged in.");
    if (!scrimId || !acceptingTeamId) throw new HttpsError("invalid-argument", "Missing scrim or team ID.");

    const scrimRef = db.collection("scrims").doc(scrimId);
    const acceptingTeamRef = db.collection("teams").doc(acceptingTeamId);
    const memberRef = acceptingTeamRef.collection("members").doc(uid);

    return db.runTransaction(async (transaction) => {
        const [scrimSnap, teamSnap, memberSnap] = await Promise.all([
            transaction.get(scrimRef),
            transaction.get(acceptingTeamRef),
            transaction.get(memberRef),
        ]);

        if (!scrimSnap.exists) throw new HttpsError("not-found", "Scrim not found.");
        if (!teamSnap.exists) throw new HttpsError("not-found", "Your team could not be found.");
        if (!memberSnap.exists || !STAFF_ROLES.includes(memberSnap.data()?.role)) {
            throw new HttpsError("permission-denied", "You must be staff to accept a scrim for this team.");
        }

        const scrimData = scrimSnap.data()!;
        if (scrimData.status !== 'pending') {
            throw new HttpsError("failed-precondition", "This scrim is no longer available.");
        }
        if (scrimData.teamAId === acceptingTeamId) {
            throw new HttpsError("invalid-argument", "You cannot accept your own scrim.");
        }

        transaction.update(scrimRef, {
            teamBId: acceptingTeamId,
            status: "confirmed",
        });

        // Here you would create the temporary chat
    });
});

interface CancelScrimData {
    scrimId: string;
}

export const cancelScrim = onCall(async ({ auth, data }: { auth?: any, data: CancelScrimData }) => {
    const uid = auth?.uid;
    const { scrimId } = data;
     if (!uid) throw new HttpsError("unauthenticated", "You must be logged in.");

    const scrimRef = db.collection("scrims").doc(scrimId);
    const scrimSnap = await scrimRef.get();
    if (!scrimSnap.exists) throw new HttpsError("not-found", "Scrim not found.");

    const scrimData = scrimSnap.data()!;
    
    // Check if user is staff of either team
    const teamARef = db.collection("teams").doc(scrimData.teamAId).collection("members").doc(uid);
    const teamAStaff = (await teamARef.get()).exists;
    
    let teamBStaff = false;
    if (scrimData.teamBId) {
        const teamBRef = db.collection("teams").doc(scrimData.teamBId).collection("members").doc(uid);
        teamBStaff = (await teamBRef.get()).exists;
    }

    if (!teamAStaff && !teamBStaff) {
         throw new HttpsError("permission-denied", "You are not authorized to cancel this scrim.");
    }
    
    await scrimRef.update({ status: 'cancelled' });
    
    return { success: true, message: "Scrim cancelled."};
});
