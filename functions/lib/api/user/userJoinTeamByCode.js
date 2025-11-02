"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userJoinTeamByCode = void 0;
// functions/src/api/user/userJoinTeamByCode.ts
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const zod_1 = require("zod");
require("../../lib/admin");
const _options_1 = require("../_options"); // mismo archivo de opciones que usas en /api/user
const db = (0, firestore_1.getFirestore)();
const Input = zod_1.z.object({
    code: zod_1.z.string().trim().min(6).max(32),
});
// /**
//  * Estructura esperada (recomendada):
//  * teamInvites/{code} -> {
//  *   teamId: string,
//  *   createdBy: string,
//  *   createdAt: Timestamp,
//  *   expiresAt?: Timestamp | null,
//  *   maxUses?: number | null,
//  *   usedCount?: number,
//  *   disabled?: boolean
//  * }
//  *
//  * teams/{teamId}
//  * teams/{teamId}/members/{uid} -> { role: "player" | "coach" | "founder", gameRoles?: string[], joinedAt: Timestamp }
//  * users/{uid} -> (opcional) currentTeamId
//  */
exports.userJoinTeamByCode = (0, https_1.onCall)(_options_1.defaultOpts, async (req) => {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Debes iniciar sesión.");
    const uid = req.auth.uid;
    const { code } = Input.parse(req.data ?? {});
    const inviteRef = db.doc(`teamInvites/${code}`);
    await db.runTransaction(async (tx) => {
        const invSnap = await tx.get(inviteRef);
        if (!invSnap.exists) {
            throw new https_1.HttpsError("not-found", "El código de invitación no es válido.");
        }
        const inv = invSnap.data();
        const teamId = inv.teamId;
        if (!teamId)
            throw new https_1.HttpsError("failed-precondition", "Invitación corrupta (sin teamId).");
        if (inv.disabled) {
            throw new https_1.HttpsError("failed-precondition", "Esta invitación está deshabilitada.");
        }
        if (inv.expiresAt?.toMillis && inv.expiresAt.toMillis() < Date.now()) {
            throw new https_1.HttpsError("failed-precondition", "Esta invitación ha expirado.");
        }
        // límite de usos si existe
        const maxUses = Number.isFinite(inv.maxUses) ? Number(inv.maxUses) : null;
        const usedCount = Number(inv.usedCount ?? 0);
        if (maxUses !== null && usedCount >= maxUses) {
            throw new https_1.HttpsError("failed-precondition", "Esta invitación ya no tiene usos disponibles.");
        }
        // Info del equipo
        const teamRef = db.doc(`teams/${teamId}`);
        const teamSnap = await tx.get(teamRef);
        if (!teamSnap.exists) {
            throw new https_1.HttpsError("not-found", "El equipo de la invitación no existe.");
        }
        const team = teamSnap.data();
        // capacidad opcional del equipo
        const maxMembers = Number.isFinite(team?.maxMembers) ? Number(team.maxMembers) : null;
        // contador aproximado (mejor si mantienes membersCount)
        // si no tienes membersCount, puedes contar rápido con limit (no exacto si muy grande)
        const membersCount = Number(team?.membersCount ?? 0);
        if (maxMembers !== null && membersCount >= maxMembers) {
            throw new https_1.HttpsError("failed-precondition", "El equipo está completo.");
        }
        const memberRef = teamRef.collection("members").doc(uid);
        const memberSnap = await tx.get(memberRef);
        if (memberSnap.exists) {
            // Ya es miembro -> idempotente OK
            return;
        }
        // Crea la membresía básica
        tx.set(memberRef, {
            role: "player",
            joinedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        // Actualiza contadores del team si los manejas
        tx.set(teamRef, {
            membersCount: firestore_1.FieldValue.increment(1),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        // Marca uso de la invitación
        tx.set(inviteRef, {
            usedCount: firestore_1.FieldValue.increment(1),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            // si al llegar al máximo quieres auto-desactivar:
            ...(maxUses !== null && usedCount + 1 >= maxUses ? { disabled: true } : null),
        }, { merge: true });
        // (Opcional) guarda referencia en el perfil del usuario
        const userRef = db.doc(`users/${uid}`);
        tx.set(userRef, {
            currentTeamId: teamId,
            lastJoinedTeamAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
    });
    return { success: true, message: "Te uniste al equipo con éxito." };
});
//# sourceMappingURL=userJoinTeamByCode.js.map