
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

const db = admin.firestore();

export const cleanUpOldData = onSchedule({
  schedule: "0 7 * * *", // Todos los días a las 7:00 AM UTC
  timeZone: "Europe/Madrid",
}, async () => {
  const now = admin.firestore.Timestamp.now();
  const sevenDaysAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - 30 * 24 * 60 * 60 * 1000);

  const batch = db.batch();

  // 🧹 1. Eliminar solicitudes de amistad viejas
  const oldRequests = await db.collection("friendRequests")
    .where("status", "in", ["rejected", "accepted"])
    .where("createdAt", "<", sevenDaysAgo)
    .get();

  oldRequests.forEach(doc => batch.delete(doc.ref));

  // 🧹 2. Eliminar chats inactivos o vacíos por 30 días
  const oldChats = await db.collection("chats")
    .where("lastMessageAt", "<", thirtyDaysAgo)
    .get();

  for (const chat of oldChats.docs) {
    const messagesSnap = await chat.ref.collection("messages").limit(1).get();
    if (messagesSnap.empty) {
      batch.delete(chat.ref);
    }
  }

  await batch.commit();
  console.log("✅ Limpieza completada correctamente.");
});
