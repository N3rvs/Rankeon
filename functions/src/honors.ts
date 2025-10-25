// src/functions/honors.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

// Separamos los tipos de honores para la lógica de Karma
const POSITIVE_HONORS = ['great_teammate', 'leader', 'good_communicator', 'positive_attitude'];
const NEGATIVE_HONORS = ['bad_behavior']; // Esto actúa como un "reporte"
const VALID_HONORS = [...POSITIVE_HONORS, ...NEGATIVE_HONORS];

interface GiveHonorData {
    recipientId: string;
    honorType: string;
}

// *** Añadida región ***
export const giveHonor = onCall({ region: 'europe-west1' }, async ({ auth, data }: { auth?: any, data: GiveHonorData }) => {
    const giverId = auth?.uid;
    const { recipientId, honorType } = data;

    // --- Validaciones ---
    if (!giverId) {
        throw new HttpsError("unauthenticated", "You must be logged in to give an honor.");
    }
    if (!recipientId || !honorType) {
        throw new HttpsError("invalid-argument", "Missing recipient ID or honor type.");
    }
    if (giverId === recipientId) {
        throw new HttpsError("invalid-argument", "You cannot give yourself an honor.");
    }
    if (!VALID_HONORS.includes(honorType)) {
        throw new HttpsError("invalid-argument", "Invalid honor type provided.");
    }

    const honorDocId = `${giverId}_${recipientId}`;
    const honorDocRef = db.collection("honorsGiven").doc(honorDocId);
    const recipientUserRef = db.collection("users").doc(recipientId);

    try {
        await db.runTransaction(async (transaction) => {
            const honorDoc = await transaction.get(honorDocRef);
            const recipientDoc = await transaction.get(recipientUserRef);

            if (!recipientDoc.exists) {
                throw new HttpsError("not-found", "The user you are trying to honor does not exist.");
            }

            const givenHonors = honorDoc.exists ? honorDoc.data()?.honors || [] : [];
            if (givenHonors.length > 0) {
                throw new HttpsError("already-exists", "You have already given an honor to this user. You can only give one honor per user.");
            }

            // --- Lógica de Karma ---
            let karmaIncrement = 0;
            if (POSITIVE_HONORS.includes(honorType)) karmaIncrement = 1;
            else if (NEGATIVE_HONORS.includes(honorType)) karmaIncrement = -1;

            // --- Actualizaciones en transacción ---
            transaction.set(honorDocRef, {
                giverId, recipientId, honors: [honorType],
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });

            const honorCountField = `honorCounts.${honorType}`;
            transaction.update(recipientUserRef, {
                [honorCountField]: admin.firestore.FieldValue.increment(1),
                'totalHonors': admin.firestore.FieldValue.increment(karmaIncrement)
            });
        });
        return { success: true, message: "Honor awarded successfully!" };
    } catch (error: any) { // Catch y lanzar HttpsError
        console.error(`Error giving honor from ${giverId} to ${recipientId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Failed to award honor.');
    }
});

// *** Añadida región ***
export const revokeHonor = onCall({ region: 'europe-west1' }, async ({ auth, data }: { auth?: any, data: { recipientId: string } }) => {
    const giverId = auth?.uid;
    const { recipientId } = data;

    // --- Validaciones ---
    if (!giverId) {
        throw new HttpsError("unauthenticated", "You must be logged in to revoke an honor.");
    }
    if (!recipientId) {
        throw new HttpsError("invalid-argument", "Missing recipient ID.");
    }
    if (giverId === recipientId) {
        throw new HttpsError("invalid-argument", "You cannot revoke an honor from yourself.");
    }

    const honorDocId = `${giverId}_${recipientId}`;
    const honorDocRef = db.collection("honorsGiven").doc(honorDocId);
    const recipientUserRef = db.collection("users").doc(recipientId);

    try {
        await db.runTransaction(async (transaction) => {
            const honorDoc = await transaction.get(honorDocRef);
            if (!honorDoc.exists) {
                throw new HttpsError("not-found", "No honor was found to revoke for this user.");
            }
            // Verifica si el usuario receptor existe antes de intentar actualizarlo (más seguro)
            const recipientDoc = await transaction.get(recipientUserRef);
             if (!recipientDoc.exists) {
                 // Si el receptor no existe, solo borra el registro de honor
                 transaction.delete(honorDocRef);
                 console.warn(`Recipient user ${recipientId} not found, deleting honor record only.`);
                 return; // Salir de la transacción si el usuario no existe
             }


            const honorData = honorDoc.data();
            const givenHonors: string[] = honorData?.honors || [];
            if (givenHonors.length === 0) {
                transaction.delete(honorDocRef); // Limpia doc vacío
                throw new HttpsError("not-found", "No specific honor type found in record to revoke count.");
            }

            const honorTypeToRevoke = givenHonors[0]; // Asume solo un honor por registro

            // --- Lógica de Karma ---
            let karmaIncrement = 0;
            if (POSITIVE_HONORS.includes(honorTypeToRevoke)) karmaIncrement = -1;
            else if (NEGATIVE_HONORS.includes(honorTypeToRevoke)) karmaIncrement = 1;

            // --- Actualizaciones en transacción ---
            const honorCountField = `honorCounts.${honorTypeToRevoke}`;
            transaction.update(recipientUserRef, {
                [honorCountField]: admin.firestore.FieldValue.increment(-1),
                'totalHonors': admin.firestore.FieldValue.increment(karmaIncrement)
            });

            transaction.delete(honorDocRef); // Borra el registro giver->recipient
        });
         return { success: true, message: "Honor revoked successfully." };
    } catch (error: any) { // Catch y lanzar HttpsError
        console.error(`Error revoking honor from ${giverId} for ${recipientId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Failed to revoke honor.');
    }
});