// functions/src/api/tournaments/editTournament.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import { w4 } from "../_options";
import { requireAuth, isStaff } from "./_auth";


const db = getFirestore();

// Solo permitimos editar estos campos
const EditTournamentSchema = z.object({
  tournamentId: z.string().min(1),
  name: z.string().min(3).max(80).optional(),
  description: z.string().min(10).max(5000).optional(),
  prize: z.number().nonnegative().nullable().optional(),
  currency: z.string().length(3).nullable().optional(),
  rankMin: z.string().nullable().optional(),
  rankMax: z.string().nullable().optional(),
  // Si quieres permitir mover la fecha:
  // startsAt: z.string().datetime().optional(),
});

type EditInput = z.infer<typeof EditTournamentSchema>;

export const editTournament = onCall(w4, async (req) => {
  const { uid, role } = requireAuth(req);
  const payload: EditInput = EditTournamentSchema.parse(req.data ?? {});

  const { tournamentId, ...candidateUpdate } = payload;
  const tRef = db.doc(`tournaments/${tournamentId}`);
  const snap = await tRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "Torneo no encontrado.");

  const t = snap.data() as any;

  // ¿Quién puede editar? owner del torneo o staff (owner|admin|moderator)
  const organizerUid: string | undefined = t?.organizer?.uid ?? t?.organizerUid;
  const isOwner = organizerUid === uid;
  if (!isOwner && !isStaff(role)) {
    throw new HttpsError("permission-denied", "No estás autorizado para editar este torneo.");
  }

  // Campos que jamás se tocan desde esta función
  const forbidden = new Set([
    "id",
    "status",
    "createdAt",
    "proposalId",
    "registeredTeamsCount",
    "winnerId",
    "organizer",
    "organizerUid",
    "format", // si no quieres que cambien el formato una vez creado
  ]);

  // Filtra cualquier campo no permitido
  const safeUpdate: Record<string, any> = {};
  for (const [k, v] of Object.entries(candidateUpdate)) {
    if (v === undefined) continue;
    if (forbidden.has(k)) continue;
    // Normaliza nulos/strings
    if (k === "currency" && v !== null) safeUpdate[k] = String(v).toUpperCase();
    else safeUpdate[k] = v;
  }

  if (Object.keys(safeUpdate).length === 0) {
    return { success: true, message: "No hay cambios que aplicar." };
  }

  // Si habilitas mover fecha:
  // if (safeUpdate.startsAt) {
  //   safeUpdate.startsAt = new Date(String(safeUpdate.startsAt)).toISOString();
  // }

  safeUpdate.updatedAt = Date.now();

  await tRef.update(safeUpdate);

  return { success: true, message: "Torneo actualizado.", changes: safeUpdate };
});
