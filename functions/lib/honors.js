"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.giveHonor = void 0;
// src/functions/honors.ts
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
const VALID_HONORS = ['great_teammate', 'leader', 'good_communicator', 'positive_attitude'];
exports.giveHonor = (0, https_1.onCall)(async ({ auth, data }) => {
    const giverId = auth === null || auth === void 0 ? void 0 : auth.uid;
    const { recipientId, honorType } = data;
    if (!giverId) {
        throw new https_1.HttpsError("unauthenticated", "You must be logged in to give an honor.");
    }
    if (!recipientId || !honorType) {
        throw new https_1.HttpsError("invalid-argument", "Missing recipient ID or honor type.");
    }
    if (giverId === recipientId) {
        throw new https_1.HttpsError("invalid-argument", "You cannot give yourself an honor.");
    }
    if (!VALID_HONORS.includes(honorType)) {
        throw new https_1.HttpsError("invalid-argument", "Invalid honor type provided.");
    }
    const honorDocId = `${giverId}_${recipientId}`;
    const honorDocRef = db.collection("honorsGiven").doc(honorDocId);
    const recipientUserRef = db.collection("users").doc(recipientId);
    return db.runTransaction(async (transaction) => {
        var _a;
        const honorDoc = await transaction.get(honorDocRef);
        const recipientDoc = await transaction.get(recipientUserRef);
        if (!recipientDoc.exists) {
            throw new https_1.HttpsError("not-found", "The user you are trying to honor does not exist.");
        }
        const givenHonors = honorDoc.exists ? ((_a = honorDoc.data()) === null || _a === void 0 ? void 0 : _a.honors) || [] : [];
        if (givenHonors.length > 0) {
            throw new https_1.HttpsError("already-exists", "You have already given an honor to this user. You can only give one honor per user.");
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
//# sourceMappingURL=honors.js.map