// src/functions/honors.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

const VALID_HONORS = ['great_teammate', 'leader', 'good_communicator', 'positive_attitude', 'bad_behavior'];

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
        if (givenHonors.length > 0) {
            throw new HttpsError("already-exists", "You have already given an honor to this user. You can only give one honor per user.");
        }

        // Add the honor to the specific giver->recipient document
        transaction.set(honorDocRef, {
            giverId,
            recipientId,
            honors: [honorType],
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

export const revokeHonor = onCall(async ({ auth, data }: { auth?: any, data: { recipientId: string } }) => {
    const giverId = auth?.uid;
    const { recipientId } = data;

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

    return db.runTransaction(async (transaction) => {
        const honorDoc = await transaction.get(honorDocRef);
        if (!honorDoc.exists) {
            throw new HttpsError("not-found", "No honor was found to revoke for this user.");
        }

        const honorData = honorDoc.data();
        const givenHonors: string[] = honorData?.honors || [];
        if (givenHonors.length === 0) {
            transaction.delete(honorDocRef); // Clean up empty doc
            throw new HttpsError("not-found", "No honor type found to revoke.");
        }
        
        const honorTypeToRevoke = givenHonors[0];

        // Decrement the denormalized count on the recipient's user document
        const honorCountField = `honorCounts.${honorTypeToRevoke}`;
        transaction.update(recipientUserRef, {
            [honorCountField]: admin.firestore.FieldValue.increment(-1)
        });

        // Delete the giver->recipient document
        transaction.delete(honorDocRef);

        return { success: true, message: "Honor revoked successfully." };
    });
});
