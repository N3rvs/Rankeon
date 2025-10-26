// src/functions/tournaments.ts
// *** CORRECCIÓN: Importar CallableRequest ***
import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { z } from 'zod'; // Asegúrate de tener 'zod' en tu package.json

const db = admin.firestore();

// --- INTERFACES ---
interface ProposeTournamentData {
  name: string;
  game: string;
  description: string;
  proposedDate: string; // ISO String from client
  format: string;
  maxTeams: number;
  rankMin?: string;
  rankMax?: string;
  prize?: number;
  currency?: string;
}
interface ReviewTournamentData {
  proposalId: string;
  status: 'approved' | 'rejected';
}
interface EditTournamentData {
    tournamentId: string;
    name: string;
    description: string;
    prize?: number;
    currency?: string;
    rankMin?: string;
    rankMax?: string;
}
interface DeleteTournamentData {
    tournamentId: string;
}
interface RegisterTeamData {
  tournamentId: string;
  teamId: string;
}

// *** CORRECCIÓN: Definir el tipo de la subcolección 'teams' ***
interface RegisteredTeam {
    id: string; // ID del documento (es el teamId)
    teamName: string;
    teamAvatarUrl: string;
    registeredAt: admin.firestore.Timestamp;
    // Añade cualquier otro campo que guardes al registrar
}

// --- Esquemas de Zod para validación ---
const ReportBracketMatchResultSchema = z.object({
  tournamentId: z.string().min(1),
  matchId: z.string().min(1),
  winnerId: z.string().min(1),
});
type ReportBracketMatchResultData = z.infer<typeof ReportBracketMatchResultSchema>;

const ReportRoundRobinMatchResultSchema = z.object({
  tournamentId: z.string().min(1),
  matchId: z.string().min(1),
  winnerId: z.string().min(1),
  loserId: z.string().min(1),
});
type ReportRoundRobinMatchResultData = z.infer<typeof ReportRoundRobinMatchResultSchema>;


// --- FUNCIONES ---

// *** CORRECCIÓN: Tipar el request ***
export const generateTournamentStructure = onCall({ region: 'europe-west1' }, async (request: CallableRequest<{ tournamentId: string }>) => {
    if (!request.auth || !['admin', 'moderator'].includes(request.auth.token.role)) {
        throw new HttpsError('permission-denied', 'No tienes permiso.');
    }
    const { tournamentId } = request.data; // <-- Ahora request.data está tipado
    if (!tournamentId) {
        throw new HttpsError('invalid-argument', 'Falta Tournament ID.');
    }

    const tournamentRef = db.doc(`tournaments/${tournamentId}`);
    try {
        const tournamentSnap = await tournamentRef.get();
        if (!tournamentSnap.exists) throw new HttpsError('not-found', 'Torneo no encontrado.');
        const tournamentData = tournamentSnap.data()!;
        const { format } = tournamentData;

        const teamsSnap = await tournamentRef.collection('teams').get();
        // *** CORRECCIÓN: Aplicar tipo RegisteredTeam ***
        const teams = teamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as RegisteredTeam));

        if (teams.length < 2) throw new HttpsError('failed-precondition', 'No hay suficientes equipos.');
        const batch = db.batch();

        if (format === 'single-elimination') {
            const shuffledTeams = teams.sort(() => 0.5 - Math.random());
            let round = 1;
            let currentRoundMatches: { id: string, [key: string]: any }[] = [];
            let nextRoundMatchIds: string[] = [];

            for (let i = 0; i < shuffledTeams.length; i += 2) {
                const matchRef = tournamentRef.collection('matches').doc();
                // *** CORREGIDO: TypeScript ahora sabe que .teamName y .teamAvatarUrl existen ***
                const teamAData = { id: shuffledTeams[i].id, name: shuffledTeams[i].teamName, avatarUrl: shuffledTeams[i].teamAvatarUrl };
                const teamBData = shuffledTeams[i + 1] ? { id: shuffledTeams[i + 1].id, name: shuffledTeams[i + 1].teamName, avatarUrl: shuffledTeams[i + 1].teamAvatarUrl } : null;
                const matchData = {
                    round: 1, teamA: teamAData, teamB: teamBData, nextMatchId: null,
                    status: teamBData ? 'pending' : 'awaiting_opponent',
                    winnerId: teamBData ? null : teamAData.id
                };
                currentRoundMatches.push({ id: matchRef.id, ...matchData });
                batch.set(matchRef, matchData);
            }

            let matchesInCurrentRound = currentRoundMatches.length;
            while (matchesInCurrentRound > 1) {
                round++;
                const previousRoundMatches = [...currentRoundMatches];
                currentRoundMatches = [];
                nextRoundMatchIds = [];
                for (let i = 0; i < matchesInCurrentRound; i += 2) {
                   const matchRef = tournamentRef.collection('matches').doc();
                   nextRoundMatchIds.push(matchRef.id);
                   const matchData = { round: round, teamA: null, teamB: null, nextMatchId: null, status: 'locked' };
                   currentRoundMatches.push({ id: matchRef.id, ...matchData });
                   batch.set(matchRef, matchData);
                }
                for (let i = 0; i < previousRoundMatches.length; i++) {
                   const matchIdToUpdate = previousRoundMatches[i].id;
                   const nextMatchId = nextRoundMatchIds[Math.floor(i / 2)];
                   batch.update(tournamentRef.collection('matches').doc(matchIdToUpdate), { nextMatchId: nextMatchId });
                   // Avanzar equipos 'bye'
                   if (previousRoundMatches[i].winnerId) {
                         const winnerData = previousRoundMatches[i].teamA; 
                         const nextMatchRef = tournamentRef.collection('matches').doc(nextMatchId);
                         if (i % 2 === 0) { // Si es el primer partido (par), va al slot A
                             batch.update(nextMatchRef, { teamA: winnerData, status: 'awaiting_opponent' });
                         }
                         // (La lógica para el slot B se complica si AMBOS avanzan,
                         // se manejará mejor en reportBracketMatchResult)
                    }
                }
                matchesInCurrentRound = Math.ceil(matchesInCurrentRound / 2);
            }

        } else if (format === 'round-robin') {
             teams.forEach(team => {
                 const standingRef = tournamentRef.collection('standings').doc(team.id);
                 // *** CORREGIDO: TypeScript ahora sabe que team.teamName existe ***
                 batch.set(standingRef, {
                     teamId: team.id, teamName: team.teamName, teamAvatarUrl: team.teamAvatarUrl,
                     wins: 0, losses: 0, draws: 0, points: 0
                 });
             });
             for (let i = 0; i < teams.length; i++) {
                 for (let j = i + 1; j < teams.length; j++) {
                     const matchRef = tournamentRef.collection('schedule').doc();
                     // *** CORREGIDO: TypeScript ahora sabe que .teamName y .teamAvatarUrl existen ***
                     batch.set(matchRef, {
                         teamA: { id: teams[i].id, name: teams[i].teamName, avatarUrl: teams[i].teamAvatarUrl },
                         teamB: { id: teams[j].id, name: teams[j].teamName, avatarUrl: teams[j].teamAvatarUrl },
                         status: 'pending', winnerId: null,
                     });
                 }
             }
        } else {
            throw new HttpsError('unimplemented', `The format "${format}" is not supported yet.`);
        }
        batch.update(tournamentRef, { status: 'ongoing' });
        await batch.commit();
        return { success: true, message: `Structure for ${format} tournament generated.` };
    } catch (error: any) {
        console.error('Error generating tournament structure:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Failed to generate tournament structure.');
    }
});

// *** CORRECCIÓN: Tipar el request ***
export const reportBracketMatchResult = onCall({ region: 'europe-west1' }, async (request: CallableRequest<ReportBracketMatchResultData>) => {
    if (!request.auth || !['admin', 'moderator'].includes(request.auth.token.role)) {
        throw new HttpsError('permission-denied', 'You do not have permission to report results.');
    }
    try {
        // *** CORRECCIÓN: Zod parsea request.data (ahora tipado) ***
        const { tournamentId, matchId, winnerId } = ReportBracketMatchResultSchema.parse(request.data);
        const tournamentRef = db.doc(`tournaments/${tournamentId}`);
        const matchRef = tournamentRef.collection('matches').doc(matchId);

        await db.runTransaction(async (transaction) => {
            const matchDoc = await transaction.get(matchRef);
            if (!matchDoc.exists) throw new HttpsError('not-found', 'Match not found.');
            const matchData = matchDoc.data()!;

            if (!matchData.teamA || !matchData.teamB) throw new HttpsError('failed-precondition', 'Match is not ready.');
            if (matchData.winnerId) throw new HttpsError('failed-precondition', 'Match already has a winner.');

            const winnerData = winnerId === matchData.teamA.id ? matchData.teamA : matchData.teamB;
            if (!winnerData) throw new HttpsError('invalid-argument', 'Winner ID does not match teams.');

            transaction.update(matchRef, { winnerId: winnerId, status: 'completed' });

            if (matchData.nextMatchId) {
                const nextMatchRef = tournamentRef.collection('matches').doc(matchData.nextMatchId);
                const nextMatchDoc = await transaction.get(nextMatchRef);
                if (!nextMatchDoc.exists) throw new HttpsError('internal', 'Next match reference broken.');
                const nextMatchData = nextMatchDoc.data()!;
                if (!nextMatchData.teamA) {
                    transaction.update(nextMatchRef, { teamA: winnerData, status: nextMatchData.teamB ? 'pending' : 'awaiting_opponent' });
                } else if (!nextMatchData.teamB) {
                    transaction.update(nextMatchRef, { teamB: winnerData, status: 'pending' });
                }
            } else {
                transaction.update(tournamentRef, { winnerId: winnerId, status: 'completed' });
            }
        });
        return { success: true, message: 'Match result reported.' };
    } catch (error: any) {
        console.error('Error reporting bracket match result:', error);
        if (error instanceof z.ZodError) throw new HttpsError('invalid-argument', 'Invalid data: ' + error.message);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Failed to report result.');
    }
});

// *** CORRECCIÓN: Tipar el request ***
export const reportRoundRobinMatchResult = onCall({ region: 'europe-west1' }, async (request: CallableRequest<ReportRoundRobinMatchResultData>) => {
     if (!request.auth || !['admin', 'moderator'].includes(request.auth.token.role)) {
        throw new HttpsError('permission-denied', 'You do not have permission.');
    }
    try {
        // *** CORRECCIÓN: Zod parsea request.data (ahora tipado) ***
        const { tournamentId, matchId, winnerId, loserId } = ReportRoundRobinMatchResultSchema.parse(request.data);
        const tournamentRef = db.doc(`tournaments/${tournamentId}`);
        const matchRef = tournamentRef.collection('schedule').doc(matchId);
        const winnerStandingsRef = tournamentRef.collection('standings').doc(winnerId);
        const loserStandingsRef = tournamentRef.collection('standings').doc(loserId);

        await db.runTransaction(async (transaction) => {
            const [matchDoc, winnerDoc, loserDoc] = await Promise.all([
                 transaction.get(matchRef), transaction.get(winnerStandingsRef), transaction.get(loserStandingsRef)
            ]);
            if (!matchDoc.exists || matchDoc.data()?.status === 'completed') throw new HttpsError('failed-precondition', 'Match not reportable.');
            if (!winnerDoc.exists || !loserDoc.exists) throw new HttpsError('not-found', 'Standings document not found.');

            transaction.update(matchRef, { status: 'completed', winnerId: winnerId });
            transaction.update(winnerStandingsRef, { wins: admin.firestore.FieldValue.increment(1) });
            transaction.update(loserStandingsRef, { losses: admin.firestore.FieldValue.increment(1) });
        });
        return { success: true, message: 'Match result reported.' };
    } catch (error: any) {
        console.error('Error reporting round-robin match result:', error);
        if (error instanceof z.ZodError) throw new HttpsError('invalid-argument', 'Invalid data: ' + error.message);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Failed to report result.');
    }
});

// *** CORRECCIÓN: Tipar el request ***
export const registerTeamForTournament = onCall({ region: 'europe-west1' }, async (request: CallableRequest<RegisterTeamData>) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "...");
    const { uid } = request.auth;
    const { tournamentId, teamId } = request.data; // <-- Tipado
    if (!tournamentId || !teamId) throw new HttpsError("invalid-argument", "...");

    const tournamentRef = db.collection("tournaments").doc(tournamentId);
    const teamRef = db.collection("teams").doc(teamId);
    const memberRef = teamRef.collection("members").doc(uid);
    const registrationRef = tournamentRef.collection("teams").doc(teamId);

    try {
        await db.runTransaction(async (transaction) => {
            const [tournamentSnap, teamSnap, memberSnap, registrationSnap] = await Promise.all([
                transaction.get(tournamentRef),
                transaction.get(teamRef),
                transaction.get(memberRef),
                transaction.get(registrationRef)
            ]);
            
            if (!tournamentSnap.exists) throw new HttpsError("not-found", "El torneo no existe.");
            if (!teamSnap.exists) throw new HttpsError("not-found", "Tu equipo no existe.");
            if (!memberSnap.exists || !['founder', 'coach'].includes(memberSnap.data()?.role)) throw new HttpsError("permission-denied", "Solo staff puede registrar.");
            if (registrationSnap.exists) throw new HttpsError("already-exists", "Equipo ya registrado.");
            
            const tournamentData = tournamentSnap.data()!;
            const teamData = teamSnap.data()!;
            
            if (tournamentData.status !== 'upcoming') throw new HttpsError("failed-precondition", "Torneo no abierto.");
            const currentTeamsCount = tournamentData.registeredTeamsCount || 0;
            if (currentTeamsCount >= tournamentData.maxTeams) throw new HttpsError("failed-precondition", "Torneo lleno.");
            
            // ... Validación de Rango ...

            transaction.set(registrationRef, {
                teamId: teamId, 
                teamName: teamData.name,
                teamAvatarUrl: teamData.avatarUrl,
                registeredAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            transaction.update(tournamentRef, {
                registeredTeamsCount: admin.firestore.FieldValue.increment(1)
            });
        });
        return { success: true, message: "Equipo registrado." };
    } catch (error: any) {
        console.error(`Error registrando equipo ${teamId} en torneo ${tournamentId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Error al registrar.');
    }
});

// *** CORRECCIÓN: Tipar el request ***
export const proposeTournament = onCall({ region: 'europe-west1' }, async (request: CallableRequest<ProposeTournamentData>) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "...");
    const { uid, token } = request.auth;
    if (!token.isCertifiedStreamer && token.role !== 'admin' && token.role !== 'moderator') {
        throw new HttpsError("permission-denied", "Solo usuarios certificados o staff pueden proponer.");
    }

    // *** CORRECCIÓN: Acceder a request.data (ahora tipado) ***
    const { name, game, description, proposedDate, format, maxTeams, rankMin, rankMax, prize, currency } = request.data;
    if (!name || !game || !description || !proposedDate || !format || !maxTeams) {
        throw new HttpsError("invalid-argument", "Faltan detalles requeridos.");
    }

    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) throw new HttpsError("not-found", "Perfil no encontrado.");
        const userData = userDoc.data()!;
        const proposerName = userData.name || 'Unknown User';
        const proposerCountry = userData.country || '';

        const proposalRef = db.collection("tournamentProposals").doc();
        await proposalRef.set({
            id: proposalRef.id,
            proposerUid: uid,
            proposerName: proposerName,
            proposerCountry: proposerCountry,
            tournamentName: name, game, description, format, maxTeams,
            proposedDate: admin.firestore.Timestamp.fromDate(new Date(proposedDate)),
            rankMin: rankMin || '', rankMax: rankMax || '',
            prize: prize || null, currency: currency || '',
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true, message: "Propuesta enviada." };
    } catch (error: any) {
        console.error(`Error proposing tournament by user ${uid}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Failed to submit proposal.');
    }
});

// *** CORRECCIÓN: Tipar el request ***
export const reviewTournamentProposal = onCall({ region: 'europe-west1' }, async (request: CallableRequest<ReviewTournamentData>) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "...");
    const { uid, token } = request.auth;
    if (token.role !== 'moderator' && token.role !== 'admin') throw new HttpsError("permission-denied", "...");
    
    // *** CORRECCIÓN: Acceder a request.data (ahora tipado) ***
    const { proposalId, status } = request.data;
    if (!proposalId || !['approved', 'rejected'].includes(status)) throw new HttpsError("invalid-argument", "...");

    const proposalRef = db.collection("tournamentProposals").doc(proposalId);
    try {
        await db.runTransaction(async (transaction) => {
            const proposalSnap = await transaction.get(proposalRef);
            if (!proposalSnap.exists) throw new HttpsError("not-found", "...");
            const proposalData = proposalSnap.data();
            if (!proposalData || proposalData.status !== 'pending') throw new HttpsError("failed-precondition", "...");

            const reviewTimestamp = admin.firestore.Timestamp.now();
            transaction.update(proposalRef, { status: status, reviewedBy: uid, reviewedAt: reviewTimestamp });

            if (status === 'approved') {
                const { tournamentName, game, description, proposedDate, format, maxTeams } = proposalData;
                if (!tournamentName || !game || !description || !proposedDate || !format || !maxTeams) {
                    throw new HttpsError("failed-precondition", "Datos de propuesta inválidos.");
                }
                const tournamentRef = db.collection('tournaments').doc();
                transaction.set(tournamentRef, {
                    ...proposalData,
                    id: tournamentRef.id,
                    registeredTeamsCount: 0,
                    winnerId: null,
                    status: 'upcoming',
                    createdAt: reviewTimestamp,
                    proposalId: proposalId,
                });
            }
        });
        return { success: true, message: `Propuesta ${status}.` };
    } catch (error: any) {
        console.error("Error in reviewTournamentProposal transaction:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Error al procesar.');
    }
});

// *** CORRECCIÓN: Tipar el request ***
export const editTournament = onCall({ region: 'europe-west1' }, async (request: CallableRequest<EditTournamentData>) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "...");
    const { uid, token } = request.auth;
    
    // *** CORRECCIÓN: Acceder a request.data (ahora tipado) ***
    const { tournamentId, ...updateData } = request.data;
    if (!tournamentId) throw new HttpsError("invalid-argument", "...");

    const tournamentRef = db.collection("tournaments").doc(tournamentId);
    try {
        const tournamentSnap = await tournamentRef.get();
        if (!tournamentSnap.exists) throw new HttpsError("not-found", "...");
        const tournamentData = tournamentSnap.data()!;
        const isOwner = tournamentData.organizer.uid === uid;
        const isModOrAdmin = token.role === 'moderator' || token.role === 'admin';
        if (!isOwner && !isModOrAdmin) throw new HttpsError("permission-denied", "...");

        const allowedUpdates = { ...updateData };
        delete (allowedUpdates as any).organizer;
        delete (allowedUpdates as any).status;
        delete (allowedUpdates as any).id;
        // ... (etc.)
        await tournamentRef.update(allowedUpdates);
        return { success: true, message: "..." };
    } catch (error: any) {
        console.error(`Error editing tournament ${tournamentId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", error.message || "...");
    }
});

// *** CORRECCIÓN: Tipar el request ***
export const deleteTournament = onCall({ region: 'europe-west1' }, async (request: CallableRequest<DeleteTournamentData>) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "...");
    const { token } = request.auth;
    if (token.role !== 'moderator' && token.role !== 'admin') throw new HttpsError("permission-denied", "...");
    
    // *** CORRECCIÓN: Acceder a request.data (ahora tipado) ***
    const { tournamentId } = request.data;
    if (!tournamentId) throw new HttpsError("invalid-argument", "...");

    const tournamentRef = db.collection("tournaments").doc(tournamentId);
    try {
        const tournamentSnap = await tournamentRef.get();
        if (!tournamentSnap.exists) return { success: true, message: "..." };
        const proposalId = tournamentSnap.data()?.proposalId;

        await deleteCollection(db, `tournaments/${tournamentId}/teams`);
        await deleteCollection(db, `tournaments/${tournamentId}/matches`);
        await deleteCollection(db, `tournaments/${tournamentId}/schedule`);
        await deleteCollection(db, `tournaments/${tournamentId}/standings`);

        const batch = db.batch();
        batch.delete(tournamentRef);
        if (proposalId) {
            batch.delete(db.collection("tournamentProposals").doc(proposalId));
        }
        await batch.commit();
        return { success: true, message: "..." };
    } catch (error: any) {
        console.error(`Error deleting tournament ${tournamentId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", error.message || "...");
    }
});


// --- FUNCIÓN DE AYUDA (Helper) para borrar colecciones ---
async function deleteCollection(
  db: admin.firestore.Firestore,
  collectionPath: string,
  batchSize: number = 400
) {
  const collectionRef = db.collection(collectionPath);
  let query = collectionRef.orderBy('__name__').limit(batchSize);
  while (true) {
    const snapshot = await query.get();
    if (snapshot.size === 0) break;
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    if (snapshot.size < batchSize) break;
    query = collectionRef.orderBy('__name__').startAfter(snapshot.docs[snapshot.docs.length - 1]).limit(batchSize);
  }
  console.log(`Finished deleting collection: ${collectionPath}`);
}