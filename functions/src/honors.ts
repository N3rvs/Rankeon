// src/functions/honors.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

const VALID_HONORS = ['great_teammate', 'leader', 'good_communicator', 'positive_attitude'];

interface GiveHonorData {
    recipientId: string;
    honorType: string;
}

export const giveHonor = onCall(async ({ auth, data }: { auth?: any, data: GiveHonorData }) => {
    const giverId = auth?.uid;
    const { recipientId, honorType } = data;

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

    return db.runTransaction(async (transaction) => {
        const honorDoc = await transaction.get(honorDocRef);
        const recipientDoc = await transaction.get(recipientUserRef);

        if (!recipientDoc.exists) {
            throw new HttpsError("not-found", "The user you are trying to honor does not exist.");
        }

        const givenHonors = honorDoc.exists ? honorDoc.data()?.honors || [] : [];
        if (givenHonors.includes(honorType)) {
            throw new HttpsError("already-exists", "You have already given this honor to this user.");
        }

        // Add the honor to the specific giver->recipient document
        transaction.set(honorDocRef, {
            giverId,
            recipientId,
            honors: admin.firestore.FieldValue.arrayUnion(honorType),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        // Increment the denormalized count on the recipient's user document
        const honorCountField = `honorCounts.${honorType}`;
        transaction.update(recipientUserRef, {
            [honorCountField]: admin.firestore.FieldValue.increment(1)
        });

        return { success: true, message: "Honor awarded successfully!" };
    });
});
