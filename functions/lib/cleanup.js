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
exports.cleanUpOldData = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
exports.cleanUpOldData = (0, scheduler_1.onSchedule)({ schedule: 'every 24 hours', timeZone: 'Europe/Madrid', region: 'europe-west1' }, async () => {
    const now = Date.now();
    const ago = (days) => admin.firestore.Timestamp.fromDate(new Date(now - days * 24 * 60 * 60 * 1000));
    // 1) Friend requests pendientes > 30 días -> cancelar
    const frSnap = await db.collection('friendRequests').where('status', '==', 'PENDING').where('createdAt', '<=', ago(30)).get();
    if (!frSnap.empty) {
        const batch = db.batch();
        frSnap.docs.forEach(d => batch.update(d.ref, { status: 'EXPIRED', updatedAt: admin.firestore.FieldValue.serverTimestamp() }));
        await batch.commit();
    }
    // 2) Notificaciones leídas > 60 días -> borrar en lotes
    const notifSnap = await db.collection('notifications').where('read', '==', true).where('readAt', '<=', ago(60)).limit(500).get();
    if (!notifSnap.empty) {
        const batch = db.batch();
        notifSnap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
    }
    // 3) Chats sin mensajes -> limpiar
    const emptyChats = await db.collection('chats').where('lastMessageText', '==', null).limit(200).get();
    for (const doc of emptyChats.docs) {
        // Borrar subcolección messages
        while (true) {
            const msgs = await doc.ref.collection('messages').limit(300).get();
            if (msgs.empty)
                break;
            const batch = db.batch();
            msgs.docs.forEach(m => batch.delete(m.ref));
            await batch.commit();
        } // Borrar doc chat
        await doc.ref.delete();
    }
});
//# sourceMappingURL=cleanup.js.map