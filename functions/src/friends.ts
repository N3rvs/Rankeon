// src/functions/friends.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

// --- INTERFACES ---
interface FriendRequestData {
  to: string;
}
interface RespondToFriendRequestData {
  requestId: string;
  accept: boolean;
}
interface RemoveFriendData {
  friendUid: string;
}
interface GetFriendshipStatusData {
    targetUserId: string;
}

// --- FUNCIONES (Región añadida y manejo de errores revisado) ---

// *** Añadida región ***
export const getFriendshipStatus = onCall({ region: 'europe-west1' }, async ({ auth, data }: { auth?: any, data: GetFriendshipStatusData }) => {
    const uid = auth?.uid;
    const { targetUserId } = data;

    if (!uid) throw new HttpsError('unauthenticated', 'You must be logged in.');
    if (!targetUserId) throw new HttpsError('invalid-argument', 'Target user ID is required.');
    if (uid === targetUserId) return { status: 'self' };

    try {
        const userDoc = await db.collection('users').doc(uid).get();
        // Es posible que el documento del usuario aún no exista si se acaba de registrar
        const userData = userDoc.exists ? userDoc.data() : null;

        if (userData?.friends?.includes(targetUserId)) {
            return { status: 'friends' };
        }

        // Consulta única y eficiente
        const existingReqSnap = await db.collection("friendRequests")
            .where("from", "in", [uid, targetUserId])
            .where("to", "in", [uid, targetUserId])
            .where("status", "==", "pending")
            .limit(1)
            .get();

        if (!existingReqSnap.empty) {
            const request = existingReqSnap.docs[0].data();
            const requestId = existingReqSnap.docs[0].id;
            if (request.from === uid) return { status: 'request_sent', requestId: requestId };
            else return { status: 'request_received', requestId: requestId };
        }

        return { status: 'not_friends' };

    } catch (error: any) { // Catch y lanzar HttpsError
        console.error(`Error getting friendship status between ${uid} and ${targetUserId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'An unexpected error occurred while checking friendship status.');
    }
});

// *** Añadida región ***
export const getFriendProfiles = onCall({ region: 'europe-west1' }, async ({ auth: callerAuth }) => {
    if (!callerAuth) throw new HttpsError('unauthenticated', 'Authentication is required.');
    const uid = callerAuth.uid;

    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) throw new HttpsError('not-found', 'Current user profile not found.');

        const userData = userDoc.data()!;
        const friendIds: string[] = userData.friends || [];
        if (friendIds.length === 0) return [];

        // Trocea IDs en chunks de 30
        const chunks: string[][] = [];
        for (let i = 0; i < friendIds.length; i += 30) {
            chunks.push(friendIds.slice(i, i + 30));
        }

        // Ejecuta consultas en paralelo
        const queries = chunks.map(chunk =>
            db.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', chunk).get()
        );
        const querySnapshots = await Promise.all(queries);

        // Combina y formatea resultados
        let friendProfiles: any[] = [];
        querySnapshots.forEach(snap => {
            const profiles = snap.docs.map(doc => {
                const data = doc.data();
                // Devuelve solo los campos necesarios y serializa Timestamps
                return {
                    id: doc.id,
                    name: data.name,
                    avatarUrl: data.avatarUrl,
                    status: data.status, // Ejemplo: añadir estado online/offline
                    lastSeen: data.lastSeen?.toDate().toISOString() || null, // Ejemplo
                    // Excluye campos sensibles como email, blocked, etc.
                    createdAt: data.createdAt?.toDate().toISOString() || null, // Opcional
                };
            });
            friendProfiles = friendProfiles.concat(profiles);
        });

        return friendProfiles;

    } catch (error: any) { // Catch y lanzar HttpsError
        console.error(`Error fetching friend profiles for user ${uid}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'An unexpected error occurred while fetching friends.');
    }
});

// *** Añadida región ***
export const sendFriendRequest = onCall({ region: 'europe-west1' }, async ({ auth, data }: { auth?: any, data: FriendRequestData }) => {
  const from = auth?.uid;
  const { to } = data;

  if (!from) throw new HttpsError("unauthenticated", "You must be logged in.");
  if (!to || from === to) throw new HttpsError("invalid-argument", "Invalid recipient user ID.");

  try {
      // Comprobaciones previas (ya amigos, solicitud pendiente)
      const fromDoc = await db.collection("users").doc(from).get();
      const fromData = fromDoc.data();
      if (fromData?.friends?.includes(to)) throw new HttpsError("already-exists", "User is already your friend.");

      // Verifica si el destinatario existe (opcional pero bueno)
      const toDoc = await db.collection("users").doc(to).get();
      if (!toDoc.exists) throw new HttpsError("not-found", "The recipient user does not exist.");

      const existingReqSnap = await db.collection("friendRequests")
        .where("from", "in", [from, to])
        .where("to", "in", [from, to])
        .where("status", "==", "pending")
        .get();
      if (!existingReqSnap.empty) throw new HttpsError("already-exists", "A pending friend request already exists.");

      // Crear solicitud y notificación en batch
      const batch = db.batch();
      const requestRef = db.collection("friendRequests").doc();
      batch.set(requestRef, {
        from, to, status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      const notificationRef = db.collection(`inbox/${to}/notifications`).doc();
      batch.set(notificationRef, {
        type: "friend_request", from, read: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        extraData: { requestId: requestRef.id }
      });
      await batch.commit();

      return { success: true };
  } catch (error: any) { // Catch y lanzar HttpsError
      console.error(`Error sending friend request from ${from} to ${to}:`, error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', error.message || 'Failed to send friend request.');
  }
});

// *** Añadida región ***
export const respondToFriendRequest = onCall({ region: 'europe-west1' }, async ({ auth, data }: { auth?: any; data: RespondToFriendRequestData }) => {
  const uid = auth?.uid; // UID del destinatario que responde
  const { requestId, accept } = data;

  if (!uid || typeof accept !== "boolean" || !requestId) {
    throw new HttpsError("invalid-argument", "Invalid data (requestId, accept).");
  }

  const requestRef = db.collection("friendRequests").doc(requestId);

  try {
      return await db.runTransaction(async (transaction) => {
        const requestSnap = await transaction.get(requestRef);
        if (!requestSnap.exists) throw new HttpsError("not-found", "Friend request not found.");

        const req = requestSnap.data();
        if (!req || req.to !== uid) throw new HttpsError("permission-denied", "This is not your request to respond to.");
        if (req.status !== 'pending') throw new HttpsError("failed-precondition", "Request already resolved.");

        transaction.update(requestRef, { status: accept ? "accepted" : "rejected" });

        if (accept) {
            const fromId = req.from;
            // Asegurarse que ambos usuarios existen antes de actualizar (más seguro)
            const userRef = db.doc(`users/${uid}`);
            const fromRef = db.doc(`users/${fromId}`);
            const [userSnap, fromSnap] = await Promise.all([transaction.get(userRef), transaction.get(fromRef)]);
            if (!userSnap.exists || !fromSnap.exists) {
                throw new HttpsError("not-found", "One of the user profiles involved does not exist.");
            }

            // Añadir amigos
            transaction.update(userRef, { friends: admin.firestore.FieldValue.arrayUnion(fromId) });
            transaction.update(fromRef, { friends: admin.firestore.FieldValue.arrayUnion(uid) });

            // Notificar al remitente original
            const notificationRef = db.collection(`inbox/${fromId}/notifications`).doc();
            transaction.set(notificationRef, {
                type: "friend_accepted", from: uid, read: false,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Crear/Actualizar documento de chat
            const members = [uid, fromId].sort();
            const chatId = members.join('_');
            const chatRef = db.collection("chats").doc(chatId);
            transaction.set(chatRef, {
                members: members,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
        }

        return { success: true, accepted: accept };
      });
  } catch (error: any) { // Catch y lanzar HttpsError
      console.error(`Error responding to friend request ${requestId} by user ${uid}:`, error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', error.message || 'Failed to respond to friend request.');
  }
});

// *** Añadida región ***
export const removeFriend = onCall({ region: 'europe-west1' }, async ({ auth, data }: { auth?: any, data: RemoveFriendData }) => {
  const uid = auth?.uid;
  const { friendUid } = data;

  if (!uid || !friendUid) {
    throw new HttpsError("invalid-argument", "Missing user ID or friend ID.");
  }
  if (uid === friendUid) {
      throw new HttpsError("invalid-argument", "Cannot remove yourself as a friend.");
  }

  // --- Primer paso: Quitar amistad y limpiar peticiones ---
  try {
      const batch = db.batch();
      const currentUserRef = db.doc(`users/${uid}`);
      const friendUserRef = db.doc(`users/${friendUid}`);

      // Quitar de ambas listas de amigos
      batch.update(currentUserRef, { friends: admin.firestore.FieldValue.arrayRemove(friendUid) });
      batch.update(friendUserRef, { friends: admin.firestore.FieldValue.arrayRemove(uid) });

      // Limpiar peticiones pendientes o aceptadas entre ellos
      const requestsSnap = await db.collection("friendRequests")
        .where("from", "in", [uid, friendUid])
        .where("to", "in", [uid, friendUid])
        .get();
      requestsSnap.forEach(doc => batch.delete(doc.ref));

      await batch.commit();
  } catch (error: any) {
      console.error(`Error removing friendship between ${uid} and ${friendUid}:`, error);
      // Si falla el primer paso, lanzar error y no continuar
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', error.message || 'Failed to update friendship status.');
  }

  // --- Segundo paso (separado): Borrar chat y notificaciones ---
  // Se hace después para que el fallo aquí no impida quitar al amigo
  try {
    const members = [uid, friendUid].sort();
    const chatId = members.join('_');
    const chatRef = db.collection("chats").doc(chatId);

    // Borrar subcolección de mensajes (usando helper si existe)
    await deleteCollection(db, `chats/${chatId}/messages`);
    // O el bucle:
    // const messagesRef = chatRef.collection("messages");
    // const batchSize = 400; let snapshot;
    // do { /* ... bucle de borrado ... */ } while (!snapshot.empty);

    // Borrar documento principal del chat
    await chatRef.delete();

    // Borrar notificaciones asociadas al chat para ambos usuarios
    const deleteNotifsBatch = db.batch();
    for(const memberId of members) {
        const notifSnap = await db.collection(`inbox/${memberId}/notifications`).where('chatId', '==', chatId).get();
        notifSnap.forEach(doc => deleteNotifsBatch.delete(doc.ref));
    }
    await deleteNotifsBatch.commit();

  } catch(error: any) {
    // Solo loguear error aquí, la amistad ya se quitó
    console.error(`Failed to delete chat history/notifications after friend removal between ${uid} and ${friendUid}. Friendship removed.`, error);
  }

  return { success: true }; // Devuelve éxito aunque falle el borrado del chat
});

// Helper para borrar colecciones (si no lo tienes en un archivo común)
async function deleteCollection(
    db: admin.firestore.Firestore,
    collectionPath: string,
    batchSize: number = 400
) {
    const collectionRef = db.collection(collectionPath);
    let query = collectionRef.orderBy('__name__').limit(batchSize);
    while (true) {
        const snapshot = await query.get();
        if (snapshot.size === 0) break;
        const batch = db.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        query = collectionRef.orderBy('__name__').startAfter(snapshot.docs[snapshot.docs.length - 1]).limit(batchSize);
    }
     console.log(`Finished deleting collection: ${collectionPath}`);
}