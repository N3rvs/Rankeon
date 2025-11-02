"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.editTournament = void 0;
// functions/src/api/tournaments/editTournament.ts
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const zod_1 = require("zod");
const _options_1 = require("../_options");
const _auth_1 = require("./_auth");
const db = (0, firestore_1.getFirestore)();
// Solo permitimos editar estos campos
const EditTournamentSchema = zod_1.z.object({
    tournamentId: zod_1.z.string().min(1),
    name: zod_1.z.string().min(3).max(80).optional(),
    description: zod_1.z.string().min(10).max(5000).optional(),
    prize: zod_1.z.number().nonnegative().nullable().optional(),
    currency: zod_1.z.string().length(3).nullable().optional(),
    rankMin: zod_1.z.string().nullable().optional(),
    rankMax: zod_1.z.string().nullable().optional(),
    // Si quieres permitir mover la fecha:
    // startsAt: z.string().datetime().optional(),
});
exports.editTournament = (0, https_1.onCall)(_options_1.w4, async (req) => {
    const { uid, role } = (0, _auth_1.requireAuth)(req);
    const payload = EditTournamentSchema.parse(req.data ?? {});
    const { tournamentId, ...candidateUpdate } = payload;
    const tRef = db.doc(`tournaments/${tournamentId}`);
    const snap = await tRef.get();
    if (!snap.exists)
        throw new https_1.HttpsError("not-found", "Torneo no encontrado.");
    const t = snap.data();
    // ¿Quién puede editar? owner del torneo o staff (owner|admin|moderator)
    const organizerUid = t?.organizer?.uid ?? t?.organizerUid;
    const isOwner = organizerUid === uid;
    if (!isOwner && !(0, _auth_1.isStaff)(role)) {
        throw new https_1.HttpsError("permission-denied", "No estás autorizado para editar este torneo.");
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
    const safeUpdate = {};
    for (const [k, v] of Object.entries(candidateUpdate)) {
        if (v === undefined)
            continue;
        if (forbidden.has(k))
            continue;
        // Normaliza nulos/strings
        if (k === "currency" && v !== null)
            safeUpdate[k] = String(v).toUpperCase();
        else
            safeUpdate[k] = v;
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
//# sourceMappingURL=editTournament.js.map