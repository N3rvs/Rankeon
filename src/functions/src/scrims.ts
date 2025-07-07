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

        const acceptingTeamData = teamSnap.data()!;
        transaction.update(scrimRef, {
            teamBId: acceptingTeamId,
            teamBName: acceptingTeamData.name,
            teamBAvatarUrl: acceptingTeamData.avatarUrl,
            status: "confirmed",
        });
        
        // Notify the creator team's founder
        const creatorTeamFounder = (await db.collection("teams").doc(scrimData.teamAId).get()).data()?.founder;
        if(creatorTeamFounder) {
             const notificationRef = db.collection(`inbox/${creatorTeamFounder}/notifications`).doc();
             transaction.set(notificationRef, {
                type: "scrim_accepted",
                from: acceptingTeamId, // from the team ID
                read: false,
                timestamp: Timestamp.now(),
                extraData: { 
                    scrimId: scrimId,
                    acceptingTeamName: acceptingTeamData.name
                }
            });
        }
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
    
    return db.runTransaction(async (transaction) => {
        const scrimSnap = await transaction.get(scrimRef);
        if (!scrimSnap.exists) throw new HttpsError("not-found", "Scrim not found.");

        const scrimData = scrimSnap.data()!;
        
        // Check if user is staff of either team
        const teamARef = db.collection("teams").doc(scrimData.teamAId).collection("members").doc(uid);
        const memberASnap = await transaction.get(teamARef);
        const teamAStaff = memberASnap.exists && STAFF_ROLES.includes(memberASnap.data()?.role);
        
        let teamBStaff = false;
        if (scrimData.teamBId) {
            const teamBRef = db.collection("teams").doc(scrimData.teamBId).collection("members").doc(uid);
            const memberBSnap = await transaction.get(teamBRef);
            teamBStaff = memberBSnap.exists && STAFF_ROLES.includes(memberBSnap.data()?.role);
        }

        if (!teamAStaff && !teamBStaff) {
             throw new HttpsError("permission-denied", "You are not authorized to cancel this scrim.");
        }
        
        if (scrimData.status === 'pending') {
            transaction.delete(scrimRef);
            return { success: true, message: "Scrim posting has been deleted." };
        }

        if (scrimData.status === 'confirmed') {
            transaction.update(scrimRef, { status: 'cancelled' });
            return { success: true, message: "Scrim cancelled successfully."};
        }
        
        return { success: false, message: "Scrim cannot be cancelled in its current state."};
    });
});

interface ReportResultData {
    scrimId: string;
    winnerId: string;
}

export const reportScrimResult = onCall(async ({ auth, data }: { auth?: any, data: ReportResultData }) => {
    const uid = auth?.uid;
    const { scrimId, winnerId } = data;

    if (!uid) throw new HttpsError("unauthenticated", "You must be logged in.");
    if (!scrimId || !winnerId) throw new HttpsError("invalid-argument", "Missing required data to report result.");

    const scrimRef = db.collection("scrims").doc(scrimId);

    return db.runTransaction(async (transaction) => {
        const scrimSnap = await transaction.get(scrimRef);
        if (!scrimSnap.exists) throw new HttpsError("not-found", "Scrim not found.");

        const scrimData = scrimSnap.data()!;
        if (scrimData.status !== 'confirmed') {
            throw new HttpsError("failed-precondition", "Only confirmed scrims can have their results reported.");
        }

        const teamAId = scrimData.teamAId;
        const teamBId = scrimData.teamBId;

        if (winnerId !== teamAId && winnerId !== teamBId) {
            throw new HttpsError("invalid-argument", "Winner must be one of the participating teams.");
        }

        const memberCheckA = await transaction.get(db.collection('teams').doc(teamAId).collection('members').doc(uid));
        const memberCheckB = await transaction.get(db.collection('teams').doc(teamBId).collection('members').doc(uid));
        const isStaff = (memberCheckA.exists && STAFF_ROLES.includes(memberCheckA.data()?.role)) || (memberCheckB.exists && STAFF_ROLES.includes(memberCheckB.data()?.role));
        
        if (!isStaff) {
            throw new HttpsError("permission-denied", "You must be a staff member of a participating team to report the result.");
        }
        
        const loserId = winnerId === teamAId ? teamBId : teamAId;

        // Update Scrim document
        transaction.update(scrimRef, { status: 'completed', winnerId: winnerId });

        // Update Winner's stats
        const winnerRef = db.collection('teams').doc(winnerId);
        transaction.set(winnerRef, { 
            stats: { 
                scrimsPlayed: admin.firestore.FieldValue.increment(1),
                scrimsWon: admin.firestore.FieldValue.increment(1)
            } 
        }, { merge: true });
        
        // Update Loser's stats
        const loserRef = db.collection('teams').doc(loserId);
        transaction.set(loserRef, { 
            stats: { 
                scrimsPlayed: admin.firestore.FieldValue.increment(1),
                scrimsWon: admin.firestore.FieldValue.increment(0) // Ensure field exists
            } 
        }, { merge: true });

        return { success: true, message: "Result reported successfully."};
    });
});
