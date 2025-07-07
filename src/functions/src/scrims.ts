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
        status: "open",
        createdAt: Timestamp.now(),
        rankMin: rankMin || '',
        rankMax: rankMax || '',
    });

    return { success: true, scrimId: scrimRef.id };
});

interface ChallengeScrimData {
    scrimId: string;
    challengingTeamId: string;
}

export const challengeScrim = onCall(async ({ auth, data }: { auth?: any, data: ChallengeScrimData }) => {
    const uid = auth?.uid;
    const { scrimId, challengingTeamId } = data;

    if (!uid) throw new HttpsError("unauthenticated", "You must be logged in.");
    if (!scrimId || !challengingTeamId) throw new HttpsError("invalid-argument", "Missing scrim or team ID.");

    const scrimRef = db.collection("scrims").doc(scrimId);
    const challengerTeamRef = db.collection("teams").doc(challengingTeamId);
    const memberRef = challengerTeamRef.collection("members").doc(uid);

    return db.runTransaction(async (transaction) => {
        const [scrimSnap, teamSnap, memberSnap] = await Promise.all([
            transaction.get(scrimRef),
            transaction.get(challengerTeamRef),
            transaction.get(memberRef),
        ]);

        if (!scrimSnap.exists) throw new HttpsError("not-found", "Scrim not found.");
        if (!teamSnap.exists) throw new HttpsError("not-found", "Your team could not be found.");
        if (!memberSnap.exists || !STAFF_ROLES.includes(memberSnap.data()?.role)) {
            throw new HttpsError("permission-denied", "You must be staff to challenge a scrim for this team.");
        }

        const scrimData = scrimSnap.data()!;
        if (scrimData.status !== 'open') {
            throw new HttpsError("failed-precondition", "This scrim is no longer available to be challenged.");
        }
        if (scrimData.teamAId === challengingTeamId) {
            throw new HttpsError("invalid-argument", "You cannot challenge your own scrim.");
        }

        const challengerTeamData = teamSnap.data()!;
        transaction.update(scrimRef, {
            challengerId: challengingTeamId,
            challengerName: challengerTeamData.name,
            challengerAvatarUrl: challengerTeamData.avatarUrl,
            status: "challenged",
        });
        
        const creatorTeam = (await transaction.get(db.collection("teams").doc(scrimData.teamAId))).data()
        const creatorTeamFounder = creatorTeam?.founder;
        if(creatorTeamFounder) {
             const notificationRef = db.collection(`inbox/${creatorTeamFounder}/notifications`).doc();
             transaction.set(notificationRef, {
                type: "scrim_challenged",
                from: challengingTeamId,
                read: false,
                timestamp: Timestamp.now(),
                extraData: { 
                    scrimId: scrimId,
                    challengerTeamName: challengerTeamData.name,
                    challengerTeamAvatarUrl: challengerTeamData.avatarUrl,
                }
            });
        }
        return { success: true, message: "Challenge sent successfully."};
    });
});


interface RespondToScrimChallengeData {
    scrimId: string;
    accept: boolean;
}

export const respondToScrimChallenge = onCall(async ({ auth, data }: { auth?: any, data: RespondToScrimChallengeData }) => {
    const uid = auth?.uid;
    const { scrimId, accept } = data;

    if (!uid) throw new HttpsError("unauthenticated", "You must be logged in.");
    if (!scrimId) throw new HttpsError("invalid-argument", "Missing scrim ID.");

    const scrimRef = db.collection("scrims").doc(scrimId);

    return db.runTransaction(async (transaction) => {
        const scrimSnap = await transaction.get(scrimRef);
        if (!scrimSnap.exists) throw new HttpsError("not-found", "Scrim not found.");
        
        const scrimData = scrimSnap.data()!;
        const creatorTeamId = scrimData.teamAId;
        const challengerTeamId = scrimData.challengerId;

        if (scrimData.status !== 'challenged' || !challengerTeamId) {
            throw new HttpsError("failed-precondition", "This scrim is not in a challenged state.");
        }

        const memberRef = db.collection('teams').doc(creatorTeamId).collection('members').doc(uid);
        const memberSnap = await transaction.get(memberRef);
        if (!memberSnap.exists || !STAFF_ROLES.includes(memberSnap.data()?.role)) {
            throw new HttpsError("permission-denied", "You must be staff of the creator team to respond.");
        }

        const challengerTeam = (await transaction.get(db.collection("teams").doc(challengerTeamId))).data();
        if (!challengerTeam) {
             throw new HttpsError("not-found", "Challenger team could not be found.");
        }
        const challengerFounderId = challengerTeam.founder;

        if (accept) {
            transaction.update(scrimRef, {
                status: 'confirmed',
                teamBId: challengerTeamId,
                teamBName: scrimData.challengerName,
                teamBAvatarUrl: scrimData.challengerAvatarUrl,
                challengerId: admin.firestore.FieldValue.delete(),
                challengerName: admin.firestore.FieldValue.delete(),
                challengerAvatarUrl: admin.firestore.FieldValue.delete(),
            });

            if(challengerFounderId) {
                const notificationRef = db.collection(`inbox/${challengerFounderId}/notifications`).doc();
                transaction.set(notificationRef, {
                   type: "scrim_challenge_accepted",
                   from: creatorTeamId, 
                   read: false,
                   timestamp: Timestamp.now(),
                   extraData: { scrimId, creatorTeamName: scrimData.teamAName }
               });
           }
        } else { // Reject
            transaction.update(scrimRef, {
                status: 'open',
                challengerId: admin.firestore.FieldValue.delete(),
                challengerName: admin.firestore.FieldValue.delete(),
                challengerAvatarUrl: admin.firestore.FieldValue.delete(),
            });

             if(challengerFounderId) {
                const notificationRef = db.collection(`inbox/${challengerFounderId}/notifications`).doc();
                transaction.set(notificationRef, {
                   type: "scrim_challenge_rejected",
                   from: creatorTeamId, 
                   read: false,
                   timestamp: Timestamp.now(),
                   extraData: { scrimId, creatorTeamName: scrimData.teamAName }
               });
           }
        }

        return { success: true, message: `Challenge has been ${accept ? 'accepted' : 'rejected'}.`};
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
        
        const teamAStaffRef = db.collection("teams").doc(scrimData.teamAId).collection("members").doc(uid);
        const memberASnap = await transaction.get(teamAStaffRef);
        const isTeamAStaff = memberASnap.exists && STAFF_ROLES.includes(memberASnap.data()?.role);
        
        let isTeamBStaff = false;
        if (scrimData.teamBId) {
            const teamBStaffRef = db.collection("teams").doc(scrimData.teamBId).collection("members").doc(uid);
            const memberBSnap = await transaction.get(teamBStaffRef);
            isTeamBStaff = memberBSnap.exists && STAFF_ROLES.includes(memberBSnap.data()?.role);
        }

        let isChallengerStaff = false;
        if (scrimData.challengerId) {
            const challengerStaffRef = db.collection("teams").doc(scrimData.challengerId).collection("members").doc(uid);
            const challengerSnap = await transaction.get(challengerStaffRef);
            isChallengerStaff = challengerSnap.exists && STAFF_ROLES.includes(challengerSnap.data()?.role);
        }
        
        if (!isTeamAStaff && !isTeamBStaff && !isChallengerStaff) {
            throw new HttpsError("permission-denied", "You are not authorized to modify this scrim.");
        }

        if (scrimData.status === 'open' && isTeamAStaff) {
            transaction.delete(scrimRef);
            return { success: true, message: "Scrim posting has been deleted." };
        }
        
        if (scrimData.status === 'challenged' && (isTeamAStaff || isChallengerStaff)) {
             transaction.update(scrimRef, {
                status: 'open',
                challengerId: admin.firestore.FieldValue.delete(),
                challengerName: admin.firestore.FieldValue.delete(),
                challengerAvatarUrl: admin.firestore.FieldValue.delete(),
            });
            return { success: true, message: "Challenge has been withdrawn." };
        }

        if (scrimData.status === 'confirmed' && (isTeamAStaff || isTeamBStaff)) {
            transaction.update(scrimRef, { status: 'cancelled' });
            return { success: true, message: "Scrim cancelled successfully."};
        }
        
        throw new HttpsError("failed-precondition", "Scrim cannot be cancelled in its current state.");
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
