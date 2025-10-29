// functions/src/tournaments.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { z } from 'zod';

const db = admin.firestore();
const now = () => admin.firestore.FieldValue.serverTimestamp();
const tsFromISO = (iso: string) => admin.firestore.Timestamp.fromDate(new Date(iso));

function assertAuth(ctx: any) {
  if (!ctx.auth?.uid) throw new HttpsError('unauthenticated', 'You must be logged in.');
  return ctx.auth.uid as string;
}
function isStaff(req: any) {
  const role = (req.auth?.token as any)?.role;
  return role === 'admin' || role === 'moderator';
}

/* ---------- Schemas que casan con tu front ---------- */

const rankOrder = {
  Hierro: 1, Bronce: 2, Plata: 3, Oro: 4, Platino: 5, Ascendente: 6, Inmortal: 7,
} as const;

const ProposeTournamentSchema = z.object({
  name: z.string().min(5).max(100),
  game: z.string().min(1),
  description: z.string().min(20).max(1000),
  proposedDate: z.string().datetime(), // en el front la envías como ISO
  format: z.string().min(1),
  maxTeams: z.number().int().min(2).max(64),
  rankMin: z.string().optional(),
  rankMax: z.string().optional(),
  prize: z.number().positive().optional(),
  currency: z.string().optional(),
}).superRefine((d, ctx) => {
  // emparejar rankMin/rankMax
  if ((d.rankMin && !d.rankMax) || (!d.rankMin && d.rankMax)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'rankMin y rankMax deben ir juntos', path: ['rankMin'] });
  }
  // validar orden de rango
  if (d.rankMin && d.rankMax) {
    const ok = (rankOrder as any)[d.rankMin] <= (rankOrder as any)[d.rankMax];
    if (!ok) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'rankMin no puede ser > rankMax', path: ['rankMin'] });
  }
  // premio/moneda ligados
  if ((d.prize && !d.currency) || (!d.prize && d.currency)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Currency es obligatoria si hay prize', path: ['currency'] });
  }
});

const ReviewTournamentSchema = z.object({
  proposalId: z.string().min(1),
  status: z.enum(['approved', 'rejected']),
});

const EditTournamentSchema = z.object({
  tournamentId: z.string().min(1),
  name: z.string().min(5).max(100),
  description: z.string().min(20).max(1000),
  prize: z.number().positive().optional(),
  currency: z.string().optional(),
  rankMin: z.string().optional(),
  rankMax: z.string().optional(),
}).superRefine((d, ctx) => {
  if ((d.prize && !d.currency) || (!d.prize && d.currency)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Currency es obligatoria si hay prize', path: ['currency'] });
  }
});

const DeleteSchema = z.object({ tournamentId: z.string().min(1) });
const RegisterSchema = z.object({ tournamentId: z.string().min(1), teamId: z.string().min(1) });
const GenerateSchema = z.object({ tournamentId: z.string().min(1) });
const ReportBracketMatchSchema = z.object({
  tournamentId: z.string().min(1),
  matchId: z.string().min(1),
  winnerId: z.string().min(1),
});

/* ---------- Implementaciones ---------- */

// Crea una propuesta de torneo
export const proposeTournament = onCall({ region: 'europe-west1' }, async (req) => {
  const uid = assertAuth(req);
  const data = ProposeTournamentSchema.parse(req.data ?? {});
  const ref = db.collection('tournamentProposals').doc();
  await ref.set({
    ownerId: uid,
    ...data,
    proposedDate: tsFromISO(data.proposedDate),
    status: 'pending', // pending | approved | rejected
    createdAt: now(),
    updatedAt: now(),
  });
  return { success: true, message: 'Proposal submitted.' };
});

// Aprueba/Rechaza una propuesta (solo staff)
export const reviewTournamentProposal = onCall({ region: 'europe-west1' }, async (req) => {
  assertAuth(req);
  if (!isStaff(req)) throw new HttpsError('permission-denied', 'Staff only.');
  const { proposalId, status } = ReviewTournamentSchema.parse(req.data ?? {});
  const pRef = db.doc(`tournamentProposals/${proposalId}`);
  const pSnap = await pRef.get();
  if (!pSnap.exists) throw new HttpsError('not-found', 'Proposal not found');
  const proposal = pSnap.data() as any;

  await pRef.update({ status, updatedAt: now() });

  if (status === 'approved') {
    // Crear torneo a partir de la propuesta
    const tRef = db.collection('tournaments').doc();
    await tRef.set({
      name: proposal.name,
      game: proposal.game,
      description: proposal.description,
      format: proposal.format,
      maxTeams: proposal.maxTeams,
      rankMin: proposal.rankMin ?? null,
      rankMax: proposal.rankMax ?? null,
      prize: proposal.prize ?? null,
      currency: proposal.currency ?? null,
      startDate: proposal.proposedDate, // ya es Timestamp
      status: 'draft', // draft | active | finished | canceled
      createdBy: proposal.ownerId,
      createdAt: now(),
      updatedAt: now(),
      participantsCount: 0,
    });
  }

  return { success: true, message: `Proposal ${status}.` };
});

// Edita datos de un torneo (owner o staff)
export const editTournament = onCall({ region: 'europe-west1' }, async (req) => {
  const uid = assertAuth(req);
  const data = EditTournamentSchema.parse(req.data ?? {});
  const tRef = db.doc(`tournaments/${data.tournamentId}`);
  const tSnap = await tRef.get();
  if (!tSnap.exists) throw new HttpsError('not-found', 'Tournament not found');
  const t = tSnap.data() as any;
  if (t.createdBy !== uid && !isStaff(req)) throw new HttpsError('permission-denied', 'Not allowed');

  await tRef.update({
    name: data.name,
    description: data.description,
    prize: data.prize ?? null,
    currency: data.currency ?? null,
    rankMin: data.rankMin ?? null,
    rankMax: data.rankMax ?? null,
    updatedAt: now(),
  });

  return { success: true, message: 'Tournament updated.' };
});

// Elimina un torneo (owner o staff)
export const deleteTournament = onCall({ region: 'europe-west1' }, async (req) => {
  const uid = assertAuth(req);
  const { tournamentId } = DeleteSchema.parse(req.data ?? {});
  const tRef = db.doc(`tournaments/${tournamentId}`);
  const tSnap = await tRef.get();
  if (!tSnap.exists) throw new HttpsError('not-found', 'Tournament not found');
  const t = tSnap.data() as any;
  if (t.createdBy !== uid && !isStaff(req)) throw new HttpsError('permission-denied', 'Not allowed');

  await tRef.delete();
  return { success: true, message: 'Tournament deleted.' };
});

// Registro de equipo en torneo
export const registerTeamForTournament = onCall({ region: 'europe-west1' }, async (req) => {
  const uid = assertAuth(req);
  const { tournamentId, teamId } = RegisterSchema.parse(req.data ?? {});
  // (opcional) verificar que uid pertenece al teamId…

  const regRef = db.doc(`tournaments/${tournamentId}/registrations/${teamId}`);
  const tRef = db.doc(`tournaments/${tournamentId}`);

  await db.runTransaction(async (tx) => {
    const tSnap = await tx.get(tRef);
    if (!tSnap.exists) throw new HttpsError('not-found', 'Tournament not found');
    const t = tSnap.data() as any;

    const already = await tx.get(regRef);
    if (already.exists) throw new HttpsError('already-exists', 'Team already registered');
    if (t.participantsCount >= t.maxTeams) throw new HttpsError('failed-precondition', 'Tournament is full');

    tx.set(regRef, { teamId, createdBy: uid, createdAt: now() });
    tx.update(tRef, {
      participantsCount: admin.firestore.FieldValue.increment(1),
      updatedAt: now(),
    });
  });

  return { success: true, message: 'Team registered.' };
});

// Genera estructura (bracket simple placeholder)
export const generateTournamentStructure = onCall({ region: 'europe-west1' }, async (req) => {
  assertAuth(req);
  if (!isStaff(req)) throw new HttpsError('permission-denied', 'Staff only.');
  const { tournamentId } = GenerateSchema.parse(req.data ?? {});

  const tRef = db.doc(`tournaments/${tournamentId}`);
  const regsSnap = await db.collection(`tournaments/${tournamentId}/registrations`).get();
  const teams = regsSnap.docs.map(d => d.id);

  if (teams.length < 2) throw new HttpsError('failed-precondition', 'Not enough teams');

  // crear emparejamientos básicos team[i] vs team[i+1]
  const batch = db.batch();
  for (let i = 0; i < teams.length; i += 2) {
    if (!teams[i + 1]) break;
    const mRef = db.collection(`tournaments/${tournamentId}/matches`).doc();
    batch.set(mRef, {
      teamA: teams[i],
      teamB: teams[i + 1],
      round: 1,
      status: 'pending', // pending | reported
      createdAt: now(),
    });
  }
  batch.update(tRef, { status: 'active', updatedAt: now() });
  await batch.commit();

  return { success: true, message: 'Structure generated.' };
});

// Reportar ganador de un match del bracket
export const reportBracketMatchResult = onCall({ region: 'europe-west1' }, async (req) => {
  assertAuth(req);
  const { tournamentId, matchId, winnerId } = ReportBracketMatchSchema.parse(req.data ?? {});

  const mRef = db.doc(`tournaments/${tournamentId}/matches/${matchId}`);
  const mSnap = await mRef.get();
  if (!mSnap.exists) throw new HttpsError('not-found', 'Match not found');
  const m = mSnap.data() as any;
  if (![m.teamA, m.teamB].includes(winnerId)) {
    throw new HttpsError('failed-precondition', 'Winner must be one of the teams');
  }

  await mRef.update({
    winnerId,
    status: 'reported',
    reportedAt: now(),
  });

  return { success: true, message: 'Result reported.' };
});
