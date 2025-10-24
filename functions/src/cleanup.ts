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

  // *** INICIO DE LA CORRECCIÓN ***
  // El batch principal solo se usará para tareas 1 y 2
  const mainBatch = db.batch();

  // 🧹 1. Eliminar solicitudes de amistad viejas
  const oldRequests = await db.collection("friendRequests")
    .where("status", "in", ["rejected", "accepted"])
    .where("createdAt", "<", sevenDaysAgo)
    .get();

  oldRequests.forEach(doc => mainBatch.delete(doc.ref));

  // 🧹 2. Eliminar chats inactivos o vacíos por 30 días
  const oldChats = await db.collection("chats")
    .where("lastMessageAt", "<", thirtyDaysAgo)
    .get();

  for (const chat of oldChats.docs) {
    const messagesSnap = await chat.ref.collection("messages").limit(1).get();
    if (messagesSnap.empty) {
      mainBatch.delete(chat.ref);
    }
  }

  // Ejecuta el batch de limpieza (Tareas 1 y 2)
  try {
      await mainBatch.commit();
      console.log("✅ Limpieza de chats y solicitudes de amistad completada.");
  } catch (error) {
      console.error("Error en el batch de limpieza (tareas 1 y 2):", error);
  }
  // *** FIN DE LA CORRECCIÓN PARCIAL ***


  // 🧹 3. Levantar baneos temporales expirados
  // ESTO SE EJECUTA POR SEPARADO DEL BATCH PRINCIPAL
  const expiredBansQuery = db.collection("users")
    .where("disabled", "==", true)
    .where("banUntil", "<=", now);
    
  const expiredBansSnap = await expiredBansQuery.get();

  if (!expiredBansSnap.empty) {
      console.log(`Found ${expiredBansSnap.size} expired bans to lift.`);
      
      // Itera y ejecuta las actualizaciones por usuario para mantener la consistencia
      for (const userDoc of expiredBansSnap.docs) {
          const uid = userDoc.id;
          try {
              // *** INICIO DE LA CORRECCIÓN ***
              // Ambas operaciones (Auth y Firestore) deben estar juntas
              
              // 1. Unban in Auth
              await admin.auth().updateUser(uid, { disabled: false });
              
              // 2. Unban in Firestore (se ejecuta inmediatamente)
              await userDoc.ref.update({
                  disabled: false,
                  banUntil: admin.firestore.FieldValue.delete()
              });
              // *** FIN DE LA CORRECCIÓN ***

               console.log(`Lifting ban for user ${uid}.`);
          } catch (error) {
              // Si falla, al menos lo registramos.
              // El usuario puede quedar inconsistente, pero solo este usuario.
              console.error(`Failed to lift ban for user ${uid}:`, error);
          }
      }
  }

  console.log("✅ Proceso de limpieza de baneos completado.");
});