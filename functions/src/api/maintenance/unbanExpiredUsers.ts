import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import "../../admin";
import { longOpts } from "../_options";
import { requireAuth, isStaff } from "../tournaments/_auth";

const db = getFirestore();

/**
 * Desbanea usuarios con:
 *  - users.disabled === true
 *  - users.banUntil <= now
 *
 * Seguridad: solo staff (owner/admin/mod) puede ejecutarla.
 * Devuelve conteos de cambios aplicados.
 */
export const unbanExpiredUsers = onCall(longOpts, async (req) => {
    const { role } = requireAuth(req);
    if (!isStaff(role)) {
        throw new HttpsError("permission-denied", "Solo staff puede ejecutar esta acción.");
    }

    const now = Timestamp.now();

    // Buscamos usuarios candidatos (paginando en lotes)
    const PAGE = 400;
    let last:
        | FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
        | undefined;

    let totalChecked = 0;
    let totalUnbanned = 0;

    // Utilidad para trocear promesas y no saturar Admin Auth
    const chunk = <T>(arr: T[], size: number) =>
        Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
            arr.slice(i * size, i * size + size)
        );

    // eslint-disable-next-line no-constant-condition
    while (true) {
        let q = db
            .collection("users")
            .where("disabled", "==", true)
            .where("banUntil", "<=", now)
            .orderBy("banUntil", "asc")
            .orderBy("__name__", "asc")
            .limit(PAGE) as FirebaseFirestore.Query;

        if (last) q = q.startAfter(last);

        const snap = await q.get();
        if (snap.empty) break;

        totalChecked += snap.size;

        // 1) Rehabilitar en Firebase Auth (concurrencia moderada)
        const toEnable = snap.docs.map((d) => d.id);
        for (const group of chunk(toEnable, 20)) {
            await Promise.all(
                group.map((uid) =>
                    admin
                        .auth()
                        .updateUser(uid, { disabled: false })
                        .catch((err) => {
                            // No abortamos toda la corrida; solo registramos
                            console.error(`Auth updateUser(${uid}) failed:`, err);
                            return null;
                        })
                )
            );
        }

        // 2) Actualizar Firestore en batch (borra banUntil, marca disabled=false)
        const batch = db.batch();
        snap.docs.forEach((d) => {
            batch.update(d.ref, {
                disabled: false,
                banUntil: FieldValue.delete(),
                updatedAt: FieldValue.serverTimestamp(),
            });
        });
        await batch.commit();

        totalUnbanned += snap.size;

        // preparar siguiente página
        last = snap.docs[snap.docs.length - 1];
        if (snap.size < PAGE) break;
    }

    return {
        success: true,
        message: "Unban ejecutado.",
        totalChecked,
        totalUnbanned,
    };
});
