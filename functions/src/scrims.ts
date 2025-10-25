// src/functions/scrims.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();
const Timestamp = admin.firestore.Timestamp;

const STAFF_ROLES = ['founder', 'coach', 'admin']; // Roles que pueden gestionar scrims

// --- INTERFACES ---
interface CreateScrimData {
    teamId: string;
    date: string; // ISO string
    format: 'bo1' | 'bo3' | 'bo5';
    type: 'scrim' | 'tryout';
    notes?: string;
    // Campos opcionales añadidos para la mejora de consulta
    rankMin?: string;
    rankMax?: string;
    // 'country' se toma del equipo
}

interface AcceptScrimData {
    scrimId: string;
    acceptingTeamId: string;
}

interface ChallengeScrimData {
    scrimId: string;
    challengingTeamId: string;
}

interface RespondToChallengeData {
    scrimId: string;
    accept: boolean; // Si el equipo A acepta o rechaza el desafío
}

interface ReportResultData {
    scrimId: string;
    winnerId: string; // ID del equipo ganador
}

interface CancelScrimData {
    scrimId: string;
}


// --- FUNCIONES ---

export const createScrim = onCall({ region: 'europe-west1' }, async ({ auth, data }: { auth?: any, data: CreateScrimData }) => {
    const uid = auth?.uid;
    const { teamId, date, format, type, notes, rankMin, rankMax } = data;

    if (!uid) throw new HttpsError("unauthenticated", "You must be logged in.");
    if (!teamId || !date || !format || !type) {
        throw new HttpsError("invalid-argument", "Missing required scrim details (teamId, date, format, type).");
    }

    try {
        const teamRef = db.collection("teams").doc(teamId);
        const memberRef = teamRef.collection("members").doc(uid);

        const [teamSnap, memberSnap] = await Promise.all([teamRef.get(), memberRef.get()]);

        if (!teamSnap.exists) throw new HttpsError("not-found", "Team not found.");
        if (!memberSnap.exists || !STAFF_ROLES.includes(memberSnap.data()?.role)) {
            throw new HttpsError("permission-denied", "You must be staff (founder/coach) to create a scrim for this team.");
        }

        const teamData = teamSnap.data()!;
        const scrimRef = db.collection("scrims").doc();

        await scrimRef.set({
            id: scrimRef.id,
            teamAId: teamId,
            teamAName: teamData.name,
            teamAAvatarUrl: teamData.avatarUrl,
            date: Timestamp.fromDate(new Date(date)),
            format,
            type,
            notes: notes || '',
            status: "pending", // Estado inicial: esperando rival
            createdAt: Timestamp.now(),
            // Guardamos Rango y País para facilitar filtros
            rankMin: rankMin || null,
            rankMax: rankMax || null,
            country: teamData.country || null,
            // Inicializar campos que se llenarán después
            teamBId: null,
            teamBName: null,
            teamBAvatarUrl: null,
            participantIds: [teamId], // Inicialmente solo el creador
            winnerId: null,
            loserId: null,
            reportedBy: null,
            reportedAt: null,
            challengerTeamId: null,
            challengerTeamName: null,
            challengerTeamAvatarUrl: null,
        });

        return { success: true, scrimId: scrimRef.id, message: "Scrim creada, esperando rival." };
    } catch (error: any) {
        console.error(`Error creating scrim for team ${teamId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Failed to create scrim.');
    }
});

export const acceptScrim = onCall({ region: 'europe-west1' }, async ({ auth, data }: { auth?: any, data: AcceptScrimData }) => {
    const uid = auth?.uid;
    const { scrimId, acceptingTeamId } = data;

    if (!uid) throw new HttpsError("unauthenticated", "You must be logged in.");
    if (!scrimId || !acceptingTeamId) throw new HttpsError("invalid-argument", "Missing scrim or team ID.");

    const scrimRef = db.collection("scrims").doc(scrimId);
    const acceptingTeamRef = db.collection("teams").doc(acceptingTeamId);
    const memberRef = acceptingTeamRef.collection("members").doc(uid);

    try {
        await db.runTransaction(async (transaction) => {
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
                throw new HttpsError("failed-precondition", "This scrim is no longer available to accept directly.");
            }
            if (scrimData.teamAId === acceptingTeamId) {
                throw new HttpsError("invalid-argument", "You cannot accept your own scrim.");
            }

            const teamData = teamSnap.data()!;
            transaction.update(scrimRef, {
                teamBId: acceptingTeamId,
                status: "confirmed",
                teamBName: teamData.name,
                teamBAvatarUrl: teamData.avatarUrl,
                participantIds: [scrimData.teamAId, acceptingTeamId] // Actualiza array de participantes
            });

            // Sumar +1 a scrimsPlayed para ambos equipos al confirmar
            const teamARefUpdate = db.collection("teams").doc(scrimData.teamAId);
            const teamBRefUpdate = db.collection("teams").doc(acceptingTeamId);
            transaction.update(teamARefUpdate, { 'stats.scrimsPlayed': admin.firestore.FieldValue.increment(1) });
            transaction.update(teamBRefUpdate, { 'stats.scrimsPlayed': admin.firestore.FieldValue.increment(1) });

            // Aquí podrías crear un chat temporal o enviar notificaciones
        });
        return { success: true, message: "Scrim aceptada y confirmada." };
    } catch (error: any) {
        console.error(`Error accepting scrim ${scrimId} by team ${acceptingTeamId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Failed to accept scrim.');
    }
});

export const cancelScrim = onCall({ region: 'europe-west1' }, async ({ auth, data }: { auth?: any, data: CancelScrimData }) => {
    const uid = auth?.uid;
    const { scrimId } = data;
     if (!uid) throw new HttpsError("unauthenticated", "You must be logged in.");
     if (!scrimId) throw new HttpsError("invalid-argument", "Scrim ID is required.");

    const scrimRef = db.collection("scrims").doc(scrimId);
    try {
        const scrimSnap = await scrimRef.get();
        if (!scrimSnap.exists) throw new HttpsError("not-found", "Scrim not found.");

        const scrimData = scrimSnap.data()!;

        // Comprueba permisos (solo staff de equipos participantes puede cancelar)
        const teamARef = db.collection("teams").doc(scrimData.teamAId).collection("members").doc(uid);
        const teamASnap = await teamARef.get();
        const teamAStaff = teamASnap.exists && STAFF_ROLES.includes(teamASnap.data()?.role);

        let teamBStaff = false;
        // Solo comprueba permisos del equipo B si existe y la scrim no está ya cancelada/completada
        if (scrimData.teamBId && scrimData.status !== 'cancelled' && scrimData.status !== 'completed') {
            const teamBRef = db.collection("teams").doc(scrimData.teamBId).collection("members").doc(uid);
            const teamBSnap = await teamBRef.get();
            teamBStaff = teamBSnap.exists && STAFF_ROLES.includes(teamBSnap.data()?.role);
        }

        if (!teamAStaff && !teamBStaff) {
             throw new HttpsError("permission-denied", "You are not authorized staff of either participating team to cancel this scrim.");
        }

        // No se puede cancelar si ya está completada
        if (scrimData.status === 'completed') {
             throw new HttpsError("failed-precondition", `Cannot cancel a scrim that is already completed.`);
        }
        // Si ya está cancelada, devuelve éxito silenciosamente
        if (scrimData.status === 'cancelled') {
             return { success: true, message: "Scrim already cancelled."};
        }

        // Si la scrim estaba confirmada y se cancela, restar estadísticas
        if (scrimData.status === 'confirmed' && scrimData.teamBId) {
            const batch = db.batch();
            const teamARefUpdate = db.collection("teams").doc(scrimData.teamAId);
            const teamBRefUpdate = db.collection("teams").doc(scrimData.teamBId);
            // Resta 1 a scrimsPlayed solo si es > 0 para evitar negativos
            batch.update(teamARefUpdate, { 'stats.scrimsPlayed': admin.firestore.FieldValue.increment(-1) });
            batch.update(teamBRefUpdate, { 'stats.scrimsPlayed': admin.firestore.FieldValue.increment(-1) });
            // Actualiza la scrim a 'cancelled'
            batch.update(scrimRef, { status: 'cancelled' });
            await batch.commit();
        } else {
            // Si estaba 'pending' o 'challenged', solo cambia el estado
            await scrimRef.update({ status: 'cancelled' });
        }

        return { success: true, message: "Scrim cancelada."};
    } catch (error: any) {
        console.error(`Error canceling scrim ${scrimId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Failed to cancel scrim.');
    }
});

export const challengeScrim = onCall({ region: 'europe-west1' }, async ({ auth, data }: { auth?: any, data: ChallengeScrimData }) => {
    const uid = auth?.uid;
    const { scrimId, challengingTeamId } = data;

    if (!uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
    if (!scrimId || !challengingTeamId) throw new HttpsError("invalid-argument", "Faltan IDs (scrimId, challengingTeamId).");

    const scrimRef = db.collection("scrims").doc(scrimId);
    const challengingTeamRef = db.collection("teams").doc(challengingTeamId);
    const memberRef = challengingTeamRef.collection("members").doc(uid); // Miembro del equipo desafiante

    try {
        await db.runTransaction(async (transaction) => {
            const [scrimSnap, teamSnap, memberSnap] = await Promise.all([
                transaction.get(scrimRef),
                transaction.get(challengingTeamRef),
                transaction.get(memberRef),
            ]);

            if (!scrimSnap.exists) throw new HttpsError("not-found", "Scrim no encontrada.");
            if (!teamSnap.exists) throw new HttpsError("not-found", "Tu equipo no se encontró.");
            if (!memberSnap.exists || !STAFF_ROLES.includes(memberSnap.data()?.role)) {
                throw new HttpsError("permission-denied", "Debes ser staff de tu equipo para desafiar.");
            }

            const scrimData = scrimSnap.data()!;
            if (scrimData.status !== 'pending') {
                throw new HttpsError("failed-precondition", "Esta scrim ya no está disponible o ya ha sido desafiada.");
            }
            if (scrimData.teamAId === challengingTeamId) {
                throw new HttpsError("invalid-argument", "No puedes desafiar tu propia scrim.");
            }

            transaction.update(scrimRef, {
                status: "challenged",
                challengerTeamId: challengingTeamId,
                challengerTeamName: teamSnap.data()?.name,
                challengerTeamAvatarUrl: teamSnap.data()?.avatarUrl,
            });
            // Aquí enviar notificación al staff del Equipo A
        });
         return { success: true, message: "Desafío enviado al equipo creador."};
    } catch (error: any) {
        console.error(`Error challenging scrim ${scrimId} by team ${challengingTeamId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Failed to challenge scrim.');
    }
});

export const respondToScrimChallenge = onCall({ region: 'europe-west1' }, async ({ auth, data }: { auth?: any, data: RespondToChallengeData }) => {
    const uid = auth?.uid; // UID del miembro del Equipo A que responde
    const { scrimId, accept } = data;

    if (!uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
    if (!scrimId || typeof accept !== 'boolean') throw new HttpsError("invalid-argument", "Faltan datos (scrimId, accept).");

    const scrimRef = db.collection("scrims").doc(scrimId);
    try {
        await db.runTransaction(async (transaction) => {
            const scrimSnap = await transaction.get(scrimRef);
            if (!scrimSnap.exists) throw new HttpsError("not-found", "Scrim no encontrada.");

            const scrimData = scrimSnap.data()!;
            if (scrimData.status !== 'challenged' || !scrimData.challengerTeamId) {
                throw new HttpsError("failed-precondition", "Esta scrim no tiene un desafío pendiente.");
            }

            const memberRef = db.collection("teams").doc(scrimData.teamAId).collection("members").doc(uid);
            const memberSnap = await transaction.get(memberRef);
            if (!memberSnap.exists || !STAFF_ROLES.includes(memberSnap.data()?.role)) {
                throw new HttpsError("permission-denied", "Solo el staff del equipo creador puede responder.");
            }

            if (accept) {
                transaction.update(scrimRef, {
                    status: "confirmed",
                    teamBId: scrimData.challengerTeamId,
                    teamBName: scrimData.challengerTeamName,
                    teamBAvatarUrl: scrimData.challengerTeamAvatarUrl,
                    participantIds: [scrimData.teamAId, scrimData.challengerTeamId], // Actualiza participantes
                    // Limpia los campos del desafío
                    challengerTeamId: admin.firestore.FieldValue.delete(),
                    challengerTeamName: admin.firestore.FieldValue.delete(),
                    challengerTeamAvatarUrl: admin.firestore.FieldValue.delete(),
                });
                 // Sumar +1 a scrimsPlayed para ambos equipos al confirmar
                const teamARefUpdate = db.collection("teams").doc(scrimData.teamAId);
                const teamBRefUpdate = db.collection("teams").doc(scrimData.challengerTeamId);
                transaction.update(teamARefUpdate, { 'stats.scrimsPlayed': admin.firestore.FieldValue.increment(1) });
                transaction.update(teamBRefUpdate, { 'stats.scrimsPlayed': admin.firestore.FieldValue.increment(1) });
                // Notificar equipo B
            } else {
                transaction.update(scrimRef, {
                    status: "pending", // Vuelve a estar disponible para otros
                    challengerTeamId: admin.firestore.FieldValue.delete(),
                    challengerTeamName: admin.firestore.FieldValue.delete(),
                    challengerTeamAvatarUrl: admin.firestore.FieldValue.delete(),
                });
                // Notificar equipo B
            }
        });
         return { success: true, message: `Desafío ${accept ? 'aceptado' : 'rechazado'}.`};
    } catch (error: any) {
        console.error(`Error responding to challenge for scrim ${scrimId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Failed to respond to challenge.');
    }
});

export const reportScrimResult = onCall({ region: 'europe-west1' }, async ({ auth, data }: { auth?: any, data: ReportResultData }) => {
    const uid = auth?.uid;
    const { scrimId, winnerId } = data;

    if (!uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
    if (!scrimId || !winnerId) throw new HttpsError("invalid-argument", "Faltan IDs (scrimId, winnerId).");

    const scrimRef = db.collection("scrims").doc(scrimId);
    try {
        await db.runTransaction(async (transaction) => {
            const scrimSnap = await transaction.get(scrimRef);
            if (!scrimSnap.exists) throw new HttpsError("not-found", "Scrim no encontrada.");

            const scrimData = scrimSnap.data()!;
            if (scrimData.status !== 'confirmed') {
                throw new HttpsError("failed-precondition", `No se puede reportar resultado de una scrim ${scrimData.status}.`);
            }
            if (!scrimData.teamBId) {
                 throw new HttpsError("failed-precondition", `La scrim no tiene dos equipos confirmados.`);
            }

            // Comprueba permisos (staff de A o B)
            const memberARef = db.collection("teams").doc(scrimData.teamAId).collection("members").doc(uid);
            const memberBRef = db.collection("teams").doc(scrimData.teamBId).collection("members").doc(uid);
            const [memberASnap, memberBSnap] = await Promise.all([
                transaction.get(memberARef),
                transaction.get(memberBRef)
            ]);
            const isStaffA = memberASnap.exists && STAFF_ROLES.includes(memberASnap.data()?.role);
            const isStaffB = memberBSnap.exists && STAFF_ROLES.includes(memberBSnap.data()?.role);

            if (!isStaffA && !isStaffB) {
                throw new HttpsError("permission-denied", "Debes ser staff de uno de los equipos participantes para reportar.");
            }
            if (winnerId !== scrimData.teamAId && winnerId !== scrimData.teamBId) {
                throw new HttpsError("invalid-argument", "El ganador debe ser uno de los equipos participantes.");
            }

            const loserId = (winnerId === scrimData.teamAId) ? scrimData.teamBId : scrimData.teamAId;

            // 1. Actualiza scrim
            transaction.update(scrimRef, {
                status: "completed",
                winnerId: winnerId,
                loserId: loserId,
                reportedBy: uid,
                reportedAt: Timestamp.now(),
            });

            // 2. Actualiza stats (solo 'scrimsWon' del ganador, played ya se sumó)
            const winnerTeamRef = db.collection("teams").doc(winnerId);
            const loserTeamRef = db.collection("teams").doc(loserId); // Necesario si actualizas winRate

            transaction.update(winnerTeamRef, {
                'stats.scrimsWon': admin.firestore.FieldValue.increment(1)
            });

            // Opcional: Recalcular y actualizar winRate para ambos equipos
            // Necesitarías leer las stats actuales en la transacción
            const winnerSnap = await transaction.get(winnerTeamRef);
            
            const loserSnap = await transaction.get(loserTeamRef);
            const winnerStats = winnerSnap.data()?.stats ?? {scrimsPlayed: 1, scrimsWon: 1};
            const loserStats = loserSnap.data()?.stats ?? {scrimsPlayed: 1, scrimsWon: 0};
            const newWinnerWR = (winnerStats.scrimsWon + 1) / winnerStats.scrimsPlayed;
            const newLoserWR = loserStats.scrimsWon / loserStats.scrimsPlayed;
            transaction.update(winnerTeamRef, { winRate: newWinnerWR });
            transaction.update(loserTeamRef, { winRate: newLoserWR });

        });
        return { success: true, message: "Resultado reportado correctamente."};
    } catch (error: any) {
        console.error(`Error reporting result for scrim ${scrimId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Failed to report result.');
    }
});