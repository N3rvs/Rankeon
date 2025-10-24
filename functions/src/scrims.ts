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
    country?: string; // País del equipo creador
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

export const createScrim = onCall(async ({ auth, data }: { auth?: any, data: CreateScrimData }) => {
    const uid = auth?.uid;
    const { teamId, date, format, type, notes, rankMin, rankMax } = data; // Añadidos rankMin/Max

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
        date: Timestamp.fromDate(new Date(date)),
        format,
        type,
        notes: notes || '',
        status: "pending", // Estado inicial: esperando rival
        createdAt: Timestamp.now(),
        // Guardamos Rango y País para facilitar filtros en el frontend
        rankMin: rankMin || null,
        rankMax: rankMax || null,
        country: teamData.country || null, // País del equipo A
    });

    return { success: true, scrimId: scrimRef.id, message: "Scrim creada, esperando rival." };
});

// Mantenemos acceptScrim por si se usa, pero también añade participantIds
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

        const teamData = teamSnap.data()!;
        transaction.update(scrimRef, {
            teamBId: acceptingTeamId,
            status: "confirmed",
            teamBName: teamData.name,
            teamBAvatarUrl: teamData.avatarUrl,
            // *** AÑADIDO PARA MEJORA DE CONSULTA ***
            participantIds: [scrimData.teamAId, acceptingTeamId]
        });
        // Aquí podrías crear un chat temporal o enviar notificaciones
    });
    // Devuelve un mensaje genérico ya que la transacción se encarga de errores
    return { success: true, message: "Scrim aceptada." };
});

export const cancelScrim = onCall(async ({ auth, data }: { auth?: any, data: CancelScrimData }) => {
    const uid = auth?.uid;
    const { scrimId } = data;
     if (!uid) throw new HttpsError("unauthenticated", "You must be logged in.");

    const scrimRef = db.collection("scrims").doc(scrimId);
    const scrimSnap = await scrimRef.get();
    if (!scrimSnap.exists) throw new HttpsError("not-found", "Scrim not found.");

    const scrimData = scrimSnap.data()!;

    // Comprueba el ROL, no solo si existe
    const teamARef = db.collection("teams").doc(scrimData.teamAId).collection("members").doc(uid);
    const teamASnap = await teamARef.get();
    const teamAStaff = teamASnap.exists && STAFF_ROLES.includes(teamASnap.data()?.role);

    let teamBStaff = false;
    // Solo comprueba el equipo B si la scrim fue confirmada o completada
    if (scrimData.teamBId && (scrimData.status === 'confirmed' || scrimData.status === 'completed')) {
        const teamBRef = db.collection("teams").doc(scrimData.teamBId).collection("members").doc(uid);
        const teamBSnap = await teamBRef.get();
        teamBStaff = teamBSnap.exists && STAFF_ROLES.includes(teamBSnap.data()?.role);
    }

    if (!teamAStaff && !teamBStaff) {
         throw new HttpsError("permission-denied", "You are not authorized to cancel this scrim.");
    }

    if (scrimData.status === 'cancelled' || scrimData.status === 'completed') {
         throw new HttpsError("failed-precondition", `Cannot cancel a scrim that is already ${scrimData.status}.`);
    }

    // Si la scrim estaba confirmada y se cancela, restar estadísticas
    if (scrimData.status === 'confirmed' && scrimData.teamBId) {
        const batch = db.batch();
        const teamARefUpdate = db.collection("teams").doc(scrimData.teamAId);
        const teamBRefUpdate = db.collection("teams").doc(scrimData.teamBId);
        batch.update(teamARefUpdate, { 'stats.scrimsPlayed': admin.firestore.FieldValue.increment(-1) });
        batch.update(teamBRefUpdate, { 'stats.scrimsPlayed': admin.firestore.FieldValue.increment(-1) });
        // También actualiza la scrim a 'cancelled'
        batch.update(scrimRef, { status: 'cancelled' });
        await batch.commit();
    } else {
        // Si estaba 'pending' o 'challenged', solo cambia el estado
        await scrimRef.update({ status: 'cancelled' });
    }

    return { success: true, message: "Scrim cancelada."};
});

export const challengeScrim = onCall(async ({ auth, data }: { auth?: any, data: ChallengeScrimData }) => {
    const uid = auth?.uid;
    const { scrimId, challengingTeamId } = data;

    if (!uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
    if (!scrimId || !challengingTeamId) throw new HttpsError("invalid-argument", "Faltan IDs.");

    const scrimRef = db.collection("scrims").doc(scrimId);
    const challengingTeamRef = db.collection("teams").doc(challengingTeamId);
    const memberRef = challengingTeamRef.collection("members").doc(uid); // Miembro del equipo desafiante

    return db.runTransaction(async (transaction) => {
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
        if (scrimData.status !== 'pending') { // Cambiado de 'open' a 'pending'
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
        // Aquí notificar al Equipo A
    });
     return { success: true, message: "Desafío enviado al equipo A."};
});

export const respondToScrimChallenge = onCall(async ({ auth, data }: { auth?: any, data: RespondToChallengeData }) => {
    const uid = auth?.uid; // UID del miembro del Equipo A que responde
    const { scrimId, accept } = data;

    if (!uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
    if (!scrimId || typeof accept !== 'boolean') throw new HttpsError("invalid-argument", "Faltan datos.");

    const scrimRef = db.collection("scrims").doc(scrimId);

    return db.runTransaction(async (transaction) => {
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
                // *** AÑADIDO PARA MEJORA DE CONSULTA ***
                participantIds: [scrimData.teamAId, scrimData.challengerTeamId],
                // Limpia los campos del desafío
                challengerTeamId: admin.firestore.FieldValue.delete(),
                challengerTeamName: admin.firestore.FieldValue.delete(),
                challengerTeamAvatarUrl: admin.firestore.FieldValue.delete(),
            });
             // Aquí notificar al Equipo B que fue aceptado y sumar stats.scrimsPlayed a ambos
            const teamARefUpdate = db.collection("teams").doc(scrimData.teamAId);
            const teamBRefUpdate = db.collection("teams").doc(scrimData.challengerTeamId);
            transaction.update(teamARefUpdate, { 'stats.scrimsPlayed': admin.firestore.FieldValue.increment(1) });
            transaction.update(teamBRefUpdate, { 'stats.scrimsPlayed': admin.firestore.FieldValue.increment(1) });
        } else {
            transaction.update(scrimRef, {
                status: "pending", // Vuelve a estar disponible
                 // Limpia los campos del desafío
                challengerTeamId: admin.firestore.FieldValue.delete(),
                challengerTeamName: admin.firestore.FieldValue.delete(),
                challengerTeamAvatarUrl: admin.firestore.FieldValue.delete(),
            });
            // Aquí notificar al Equipo B que fue rechazado
        }
    });
     return { success: true, message: `Desafío ${accept ? 'aceptado' : 'rechazado'}.`};
});

export const reportScrimResult = onCall(async ({ auth, data }: { auth?: any, data: ReportResultData }) => {
    const uid = auth?.uid;
    const { scrimId, winnerId } = data;

    if (!uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
    if (!scrimId || !winnerId) throw new HttpsError("invalid-argument", "Faltan IDs.");

    const scrimRef = db.collection("scrims").doc(scrimId);

    return db.runTransaction(async (transaction) => {
        const scrimSnap = await transaction.get(scrimRef);
        if (!scrimSnap.exists) throw new HttpsError("not-found", "Scrim no encontrada.");

        const scrimData = scrimSnap.data()!;
        if (scrimData.status !== 'confirmed') {
            throw new HttpsError("failed-precondition", `No se puede reportar resultado de una scrim ${scrimData.status}.`);
        }
        if (!scrimData.teamBId) { // Asegura que el equipo B exista
             throw new HttpsError("failed-precondition", `La scrim no tiene dos equipos confirmados.`);
        }

        const memberARef = db.collection("teams").doc(scrimData.teamAId).collection("members").doc(uid);
        const memberBRef = db.collection("teams").doc(scrimData.teamBId).collection("members").doc(uid);
        const [memberASnap, memberBSnap] = await Promise.all([
            transaction.get(memberARef),
            transaction.get(memberBRef)
        ]);
        const isStaffA = memberASnap.exists && STAFF_ROLES.includes(memberASnap.data()?.role);
        const isStaffB = memberBSnap.exists && STAFF_ROLES.includes(memberBSnap.data()?.role);

        if (!isStaffA && !isStaffB) {
            throw new HttpsError("permission-denied", "Debes ser staff de uno de los equipos participantes.");
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

        // 2. Actualiza stats (scrimsPlayed ya se sumó al confirmar)
        const winnerTeamRef = db.collection("teams").doc(winnerId);
        const loserTeamRef = db.collection("teams").doc(loserId); // No necesitamos leer/actualizar al perdedor aquí

        transaction.update(winnerTeamRef, {
            'stats.scrimsWon': admin.firestore.FieldValue.increment(1)
        });
      
        transaction.update(loserTeamRef, { /* recalcular winRate */ });

    });
    return { success: true, message: "Resultado reportado correctamente."};
}); 