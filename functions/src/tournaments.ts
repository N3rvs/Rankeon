// src/functions/tournaments.ts
import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { z } from "zod";

const db = admin.firestore();

// ---------------------- Enums y helpers ----------------------
const MatchStatus = ['pending','awaiting_opponent','locked','completed'] as const;
// const TournamentStatus = ['upcoming','ongoing','completed'] as const;

function requireAuth<T>(req: CallableRequest<T>) {
  if (!req.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  const role = (req.auth.token as any)?.role ?? 'user';
  const isCertifiedStreamer = Boolean((req.auth.token as any)?.isCertifiedStreamer);
  return { uid: req.auth.uid, role, isCertifiedStreamer };
}

// ---------------------- Schemas Zod ----------------------
const ProposeTournamentSchema = z.object({
  name: z.string().min(3).max(80),
  game: z.string().min(1),
  description: z.string().min(10).max(5000),
  proposedDate: z.string().datetime(),
  format: z.enum(['single-elimination','round-robin']),
  maxTeams: z.number().int().min(2).max(128),
  rankMin: z.string().optional(),
  rankMax: z.string().optional(),
  prize: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
});
type ProposeTournamentData = z.infer<typeof ProposeTournamentSchema>;

const ReviewTournamentSchema = z.object({
  proposalId: z.string().min(1),
  status: z.enum(['approved','rejected']),
});
type ReviewTournamentData = z.infer<typeof ReviewTournamentSchema>;

const EditTournamentSchema = z.object({
  tournamentId: z.string().min(1),
  name: z.string().min(3).max(80).optional(),
  description: z.string().min(10).max(5000).optional(),
  prize: z.number().nonnegative().nullable().optional(),
  currency: z.string().length(3).nullable().optional(),
  rankMin: z.string().nullable().optional(),
  rankMax: z.string().nullable().optional(),
});
type EditTournamentData = z.infer<typeof EditTournamentSchema>;

const DeleteTournamentSchema = z.object({
  tournamentId: z.string().min(1),
});
type DeleteTournamentData = z.infer<typeof DeleteTournamentSchema>;

const RegisterTeamSchema = z.object({
  tournamentId: z.string().min(1),
  teamId: z.string().min(1),
});
type RegisterTeamData = z.infer<typeof RegisterTeamSchema>;

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

// ---------------------- Tipos auxiliares ----------------------
interface RegisteredTeam {
  id: string;                  // = teamId (doc id en subcolección /teams)
  teamName: string;
  teamAvatarUrl: string | null;
  registeredAt: admin.firestore.Timestamp;
}

// ---------------------- Funciones ----------------------

/**
 * Generar estructura de torneo (bracket o round-robin).
 * Requiere rol admin/moderator.
 */
export const generateTournamentStructure = onCall(
  { region: "europe-west1" },
  async (request: CallableRequest<{ tournamentId: string }>) => {
    const { role } = requireAuth(request);
    if (!['admin','moderator'].includes(role)) {
      throw new HttpsError('permission-denied', 'No tienes permiso.');
    }

    const { tournamentId } = request.data ?? {};
    if (!tournamentId) throw new HttpsError('invalid-argument', 'Falta Tournament ID.');

    const tournamentRef = db.doc(`tournaments/${tournamentId}`);

    try {
      const tournamentSnap = await tournamentRef.get();
      if (!tournamentSnap.exists) throw new HttpsError('not-found', 'Torneo no encontrado.');
      const tournamentData = tournamentSnap.data()!;
      const { format } = tournamentData as any;

      // Cargar equipos registrados
      const teamsSnap = await tournamentRef.collection('teams').get();
      const teams: RegisteredTeam[] = teamsSnap.docs.map(d => {
        const data = d.data() as any;
        return {
          id: d.id,
          teamName: data.teamName ?? '',
          teamAvatarUrl: data.teamAvatarUrl ?? null,
          registeredAt: data.registeredAt ?? admin.firestore.Timestamp.now(),
        };
      });

      if (teams.length < 2) throw new HttpsError('failed-precondition', 'No hay suficientes equipos.');

      const batch = db.batch();

      if (format === 'single-elimination') {
        // Mezclar equipos y crear primera ronda (gestiona BYEs)
        const shuffled = [...teams].sort(() => Math.random() - 0.5);
        let currentRoundMatches: { id: string; round: number; teamA: any; teamB: any; nextMatchId: string | null; status: typeof MatchStatus[number]; winnerId?: string | null }[] = [];

        for (let i = 0; i < shuffled.length; i += 2) {
          const matchRef = tournamentRef.collection('matches').doc();
          const teamA = { id: shuffled[i].id, name: shuffled[i].teamName, avatarUrl: shuffled[i].teamAvatarUrl };
          const teamB = shuffled[i + 1]
            ? { id: shuffled[i + 1].id, name: shuffled[i + 1].teamName, avatarUrl: shuffled[i + 1].teamAvatarUrl }
            : null;

          const hasBye = !teamB;
          const matchData = {
            round: 1,
            teamA,
            teamB,
            nextMatchId: null as string | null,
            status: hasBye ? 'awaiting_opponent' as const : 'pending' as const,
            winnerId: hasBye ? teamA.id : null,
          };

          currentRoundMatches.push({ id: matchRef.id, ...matchData });
          batch.set(matchRef, matchData);
        }

        // Construir rondas siguientes, encadenando nextMatchId
        let matchesInCurrentRound = currentRoundMatches.length;
        while (matchesInCurrentRound > 1) {
          const previousRoundMatches = [...currentRoundMatches];
          currentRoundMatches = [];

          // Crear siguientes partidos
          for (let i = 0; i < matchesInCurrentRound; i += 2) {
            const nextMatchRef = tournamentRef.collection('matches').doc();
            const nextMatchData = { round: (previousRoundMatches[0].round + 1), teamA: null, teamB: null, nextMatchId: null as string | null, status: 'locked' as const };
            currentRoundMatches.push({ id: nextMatchRef.id, ...nextMatchData });
            batch.set(nextMatchRef, nextMatchData);
          }

          // Ligar previous -> next y propagar BYEs a A o B según toque
          for (let i = 0; i < previousRoundMatches.length; i++) {
            const prev = previousRoundMatches[i];
            const nextId = currentRoundMatches[Math.floor(i / 2)].id;

            // Setear nextMatchId al partido previo
            batch.update(tournamentRef.collection('matches').doc(prev.id), { nextMatchId: nextId });

            // Si ya hay ganador por BYE, colocarlo en el slot correcto
            if (prev.winnerId) {
              const winnerData = prev.teamA && prev.teamA.id === prev.winnerId ? prev.teamA : prev.teamB;
              const slot = (i % 2 === 0) ? 'teamA' : 'teamB';
              const nextMatchRef = tournamentRef.collection('matches').doc(nextId);

              // Para evitar leer dentro del batch, determinamos el estado sin lookup extra:
              // - Si llenamos teamA y teamB ya está vacío -> awaiting_opponent
              // - Si llenamos teamB y A ya debe existir o no -> pending si ambos presentes
              // El estado final lo podemos normalizar más tarde en reportBracketMatchResult.
              batch.update(nextMatchRef, { [slot]: winnerData, status: (slot === 'teamA') ? 'awaiting_opponent' : 'pending' });
            }
          }

          matchesInCurrentRound = Math.ceil(matchesInCurrentRound / 2);
        }

      } else if (format === 'round-robin') {
        // Tabla inicial de posiciones
        for (const team of teams) {
          const standingRef = tournamentRef.collection('standings').doc(team.id);
          batch.set(standingRef, {
            teamId: team.id,
            teamName: team.teamName,
            teamAvatarUrl: team.teamAvatarUrl ?? null,
            wins: 0, losses: 0, draws: 0, points: 0,
          });
        }

        // Calendario: todos contra todos una vez
        for (let i = 0; i < teams.length; i++) {
          for (let j = i + 1; j < teams.length; j++) {
            const scheduleRef = tournamentRef.collection('schedule').doc();
            batch.set(scheduleRef, {
              teamA: { id: teams[i].id, name: teams[i].teamName, avatarUrl: teams[i].teamAvatarUrl ?? null },
              teamB: { id: teams[j].id, name: teams[j].teamName, avatarUrl: teams[j].teamAvatarUrl ?? null },
              status: 'pending' as const,
              winnerId: null,
            });
          }
        }
      } else {
        throw new HttpsError('unimplemented', `El formato "${format}" no está soportado.`);
      }

      batch.update(tournamentRef, { status: 'ongoing' });
      await batch.commit();
      return { success: true, message: `Estructura generada para formato ${format}.` };
    } catch (error: any) {
      console.error('Error generating tournament structure:', error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', error.message || 'Failed to generate tournament structure.');
    }
  }
);

/** Reportar resultado en bracket (solo admin/mod) */
export const reportBracketMatchResult = onCall(
  { region: 'europe-west1' },
  async (request: CallableRequest<ReportBracketMatchResultData>) => {
    const { role } = requireAuth(request);
    if (!['admin','moderator'].includes(role)) {
      throw new HttpsError('permission-denied', 'No tienes permiso.');
    }

    try {
      const { tournamentId, matchId, winnerId } = ReportBracketMatchResultSchema.parse(request.data);
      const tournamentRef = db.doc(`tournaments/${tournamentId}`);
      const matchRef = tournamentRef.collection('matches').doc(matchId);

      await db.runTransaction(async (tx) => {
        const matchDoc = await tx.get(matchRef);
        if (!matchDoc.exists) throw new HttpsError('not-found', 'Match not found.');
        const matchData = matchDoc.data() as any;

        if (!matchData.teamA || !matchData.teamB) throw new HttpsError('failed-precondition', 'Match is not ready.');
        if (matchData.winnerId) throw new HttpsError('failed-precondition', 'Match already has a winner.');

        const winnerData =
          winnerId === matchData.teamA.id ? matchData.teamA :
          winnerId === matchData.teamB.id ? matchData.teamB : null;

        if (!winnerData) throw new HttpsError('invalid-argument', 'Winner ID does not match teams.');

        tx.update(matchRef, { winnerId, status: 'completed' });

        if (matchData.nextMatchId) {
          const nextRef = tournamentRef.collection('matches').doc(matchData.nextMatchId);
          const nextDoc = await tx.get(nextRef);
          if (!nextDoc.exists) throw new HttpsError('internal', 'Next match reference broken.');
          const next = nextDoc.data() as any;

          if (!next.teamA) {
            tx.update(nextRef, { teamA: winnerData, status: next.teamB ? 'pending' : 'awaiting_opponent' });
          } else if (!next.teamB) {
            tx.update(nextRef, { teamB: winnerData, status: 'pending' });
          }
        } else {
          tx.update(tournamentRef, { winnerId, status: 'completed' });
        }
      });

      return { success: true, message: 'Match result reported.' };
    } catch (error: any) {
      console.error('Error reporting bracket match result:', error);
      if (error instanceof z.ZodError) throw new HttpsError('invalid-argument', 'Invalid data: ' + error.message);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', error.message || 'Failed to report result.');
    }
  }
);

/** Reportar resultado en round-robin (solo admin/mod) */
export const reportRoundRobinMatchResult = onCall(
  { region: 'europe-west1' },
  async (request: CallableRequest<ReportRoundRobinMatchResultData>) => {
    const { role } = requireAuth(request);
    if (!['admin','moderator'].includes(role)) {
      throw new HttpsError('permission-denied', 'No tienes permiso.');
    }

    try {
      const { tournamentId, matchId, winnerId, loserId } = ReportRoundRobinMatchResultSchema.parse(request.data);
      const tRef = db.doc(`tournaments/${tournamentId}`);
      const mRef = tRef.collection('schedule').doc(matchId);
      const winRef = tRef.collection('standings').doc(winnerId);
      const losRef = tRef.collection('standings').doc(loserId);

      await db.runTransaction(async (tx) => {
        const [mDoc, wDoc, lDoc] = await Promise.all([tx.get(mRef), tx.get(winRef), tx.get(losRef)]);
        if (!mDoc.exists || (mDoc.data() as any)?.status === 'completed') {
          throw new HttpsError('failed-precondition', 'Match not reportable.');
        }
        if (!wDoc.exists || !lDoc.exists) throw new HttpsError('not-found', 'Standings document not found.');

        tx.update(mRef, { status: 'completed', winnerId });
        tx.update(winRef, { wins: admin.firestore.FieldValue.increment(1) });
        tx.update(losRef, { losses: admin.firestore.FieldValue.increment(1) });
      });

      return { success: true, message: 'Match result reported.' };
    } catch (error: any) {
      console.error('Error reporting round-robin match result:', error);
      if (error instanceof z.ZodError) throw new HttpsError('invalid-argument', 'Invalid data: ' + error.message);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', error.message || 'Failed to report result.');
    }
  }
);

/** Registrar equipo en torneo (control de concurrencia por límite) */
export const registerTeamForTournament = onCall(
  { region: 'europe-west1' },
  async (request: CallableRequest<RegisterTeamData>) => {
    const { uid } = requireAuth(request);
    const { tournamentId, teamId } = RegisterTeamSchema.parse(request.data);

    const tRef = db.collection("tournaments").doc(tournamentId);
    const teamRef = db.collection("teams").doc(teamId);
    const memberRef = teamRef.collection("members").doc(uid); // requiere subcolección con roles
    const regRef = tRef.collection("teams").doc(teamId);

    try {
      await db.runTransaction(async (tx) => {
        const [tSnap, teamSnap, memberSnap, regSnap] = await Promise.all([
          tx.get(tRef), tx.get(teamRef), tx.get(memberRef), tx.get(regRef)
        ]);

        if (!tSnap.exists) throw new HttpsError("not-found", "El torneo no existe.");
        if (!teamSnap.exists) throw new HttpsError("not-found", "El equipo no existe.");
        if (!memberSnap.exists || !['founder','coach'].includes((memberSnap.data() as any)?.role)) {
          throw new HttpsError("permission-denied", "Solo founder/coach puede registrar.");
        }
        if (regSnap.exists) throw new HttpsError("already-exists", "Equipo ya registrado.");

        const td = tSnap.data() as any;
        if (td.status !== 'upcoming') throw new HttpsError("failed-precondition", "Torneo no abierto.");

        // Control real del cupo dentro de la transacción
        const regsSnap = await tx.get(tRef.collection("teams").limit(td.maxTeams));
        if (regsSnap.size >= td.maxTeams) throw new HttpsError("failed-precondition", "Torneo lleno.");

        tx.set(regRef, {
          teamId,
          teamName: (teamSnap.data() as any)?.name ?? '',
          teamAvatarUrl: (teamSnap.data() as any)?.avatarUrl ?? null,
          registeredAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // increment para UI (no se confía en esto para el cupo)
        tx.update(tRef, { registeredTeamsCount: admin.firestore.FieldValue.increment(1) });
      });

      return { success: true, message: "Equipo registrado." };
    } catch (error: any) {
      console.error(`Error registrando equipo ${teamId} en torneo ${tournamentId}:`, error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', error.message || 'Error al registrar.');
    }
  }
);

/** Proponer torneo (certificado o staff) */
export const proposeTournament = onCall(
  { region: 'europe-west1' },
  async (request: CallableRequest<ProposeTournamentData>) => {
    const { uid, role, isCertifiedStreamer } = requireAuth(request);
    if (!isCertifiedStreamer && !['admin','moderator'].includes(role)) {
      throw new HttpsError("permission-denied", "Solo usuarios certificados o staff pueden proponer.");
    }

    const data = ProposeTournamentSchema.parse(request.data);

    try {
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists) throw new HttpsError("not-found", "Perfil no encontrado.");
      const userData = userDoc.data() as any;

      const proposalRef = db.collection("tournamentProposals").doc();
      await proposalRef.set({
        id: proposalRef.id,
        proposerUid: uid,
        proposerName: userData?.name ?? 'Unknown User',
        proposerCountry: userData?.country ?? '',
        tournamentName: data.name,
        game: data.game,
        description: data.description,
        format: data.format,
        maxTeams: data.maxTeams,
        proposedDate: admin.firestore.Timestamp.fromDate(new Date(data.proposedDate)),
        rankMin: data.rankMin ?? '',
        rankMax: data.rankMax ?? '',
        prize: data.prize ?? null,
        currency: data.currency ?? '',
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true, message: "Propuesta enviada." };
    } catch (error: any) {
      console.error(`Error proposing tournament by user ${uid}:`, error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', error.message || 'Failed to submit proposal.');
    }
  }
);

/** Revisar propuesta (mod/admin). Si aprueba, crea torneo filtrando campos. */
export const reviewTournamentProposal = onCall(
  { region: 'europe-west1' },
  async (request: CallableRequest<ReviewTournamentData>) => {
    const { uid, role } = requireAuth(request);
    if (!['moderator','admin'].includes(role)) throw new HttpsError("permission-denied", "No autorizado.");

    const { proposalId, status } = ReviewTournamentSchema.parse(request.data);
    const proposalRef = db.collection("tournamentProposals").doc(proposalId);

    try {
      await db.runTransaction(async (tx) => {
        const p = await tx.get(proposalRef);
        if (!p.exists) throw new HttpsError("not-found", "Propuesta no encontrada.");
        const pr = p.data() as any;
        if (pr.status !== 'pending') throw new HttpsError("failed-precondition", "Propuesta ya revisada.");

        const reviewedAt = admin.firestore.Timestamp.now();
        tx.update(proposalRef, { status, reviewedBy: uid, reviewedAt });

        if (status === 'approved') {
          const { tournamentName, game, description, proposedDate, format, maxTeams } = pr;
          if (!tournamentName || !game || !description || !proposedDate || !format || !maxTeams) {
            throw new HttpsError("failed-precondition", "Datos de propuesta inválidos.");
          }
          const tRef = db.collection('tournaments').doc();
          tx.set(tRef, {
            id: tRef.id,
            name: tournamentName,
            game,
            description,
            startsAt: proposedDate,  // guardar como Timestamp ya viene desde la propuesta
            format,
            maxTeams,
            registeredTeamsCount: 0,
            winnerId: null,
            status: 'upcoming',
            createdAt: reviewedAt,
            proposalId,
          });
        }
      });

      return { success: true, message: `Propuesta ${status}.` };
    } catch (error: any) {
      console.error("Error in reviewTournamentProposal transaction:", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', error.message || 'Error al procesar.');
    }
  }
);

/** Editar torneo (owner o staff), filtrando campos no editables */
export const editTournament = onCall(
  { region: 'europe-west1' },
  async (request: CallableRequest<EditTournamentData>) => {
    const { uid, role } = requireAuth(request);
    const data = EditTournamentSchema.parse(request.data);
    const { tournamentId, ...updateData } = data;

    const tRef = db.collection("tournaments").doc(tournamentId);
    try {
      const tSnap = await tRef.get();
      if (!tSnap.exists) throw new HttpsError("not-found", "Torneo no encontrado.");
      const tData = tSnap.data() as any;

      const isOwner = tData?.organizer?.uid === uid; // si usas organizer
      const isModOrAdmin = ['moderator','admin'].includes(role);
      if (!isOwner && !isModOrAdmin) {
        throw new HttpsError("permission-denied", "No autorizado para editar.");
      }

      // Filtrar campos que no deben editarse
      const forbidden = ['organizer','status','id','createdAt','proposalId','registeredTeamsCount','winnerId'];
      forbidden.forEach((k) => delete (updateData as any)[k]);

      await tRef.update(updateData);
      return { success: true, message: "Torneo actualizado." };
    } catch (error: any) {
      console.error(`Error editing tournament ${tournamentId}:`, error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", error.message || "No se pudo actualizar.");
    }
  }
);

/** Eliminar torneo (mod/admin) con borrado recursivo de subcolecciones */
export const deleteTournament = onCall(
  { region: 'europe-west1' },
  async (request: CallableRequest<DeleteTournamentData>) => {
    const { role } = requireAuth(request);
    if (!['moderator','admin'].includes(role)) throw new HttpsError("permission-denied", "No autorizado.");

    const { tournamentId } = DeleteTournamentSchema.parse(request.data);

    const tRef = db.collection("tournaments").doc(tournamentId);
    try {
      const tSnap = await tRef.get();
      if (!tSnap.exists) return { success: true, message: "Ya estaba borrado." };
      const proposalId = (tSnap.data() as any)?.proposalId;

      await deleteCollection(db, `tournaments/${tournamentId}/teams`);
      await deleteCollection(db, `tournaments/${tournamentId}/matches`);
      await deleteCollection(db, `tournaments/${tournamentId}/schedule`);
      await deleteCollection(db, `tournaments/${tournamentId}/standings`);

      const batch = db.batch();
      batch.delete(tRef);
      if (proposalId) batch.delete(db.collection("tournamentProposals").doc(proposalId));
      await batch.commit();

      return { success: true, message: "Torneo borrado." };
    } catch (error: any) {
      console.error(`Error deleting tournament ${tournamentId}:`, error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", error.message || "No se pudo borrar el torneo.");
    }
  }
);

// ---------------------- Helper: borrar colecciones en lotes ----------------------
async function deleteCollection(
  dbi: admin.firestore.Firestore,
  collectionPath: string,
  batchSize: number = 400
) {
  const collectionRef = dbi.collection(collectionPath);
  let query = collectionRef.orderBy('__name__').limit(batchSize);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snapshot = await query.get();
    if (snapshot.empty) break;

    const batch = dbi.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    if (snapshot.size < batchSize) break;
    query = collectionRef.orderBy('__name__')
      .startAfter(snapshot.docs[snapshot.docs.length - 1])
      .limit(batchSize);
  }
  console.log(`Finished deleting collection: ${collectionPath}`);
}
