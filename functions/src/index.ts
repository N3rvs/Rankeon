
import * as admin from 'firebase-admin';
import { setGlobalOptions } from 'firebase-functions/v2';

// ===== Opciones globales =====
setGlobalOptions({
  region: 'europe-west1',
  memory: '256MiB',
  timeoutSeconds: 60,
  maxInstances: 50,
  enforceAppCheck: true, // si tu cliente usa App Check
});

// ===== Inicialización Admin SDK =====
if (admin.apps.length === 0) {
  admin.initializeApp();
  try {
    // Evita errores por campos undefined accidentales
    admin.firestore().settings({ ignoreUndefinedProperties: true });
  } catch {
    /* no-op si ya estaba configurado */
  }
}

/* ============================================================
   Re-exports organizados
   - Evitamos `export *` cuando puede haber colisiones.
   - De lo contrario exportamos todo el módulo.
   ============================================================ */

// Módulos “seguros” sin colisiones conocidas
export * from './rooms';
export * from './scrims';
export * from './tasks';
export * from './cleanup';
export * from './tickets';
export * from './teams';
export * from './tournaments';
export * from './honors';
export * from './friends';

// --------- chat: dueño de DMs y bloqueo ---------
export {
  sendMessageToFriend,
  getChats,
  getChatMessages,
  markChatRead,
  deleteChatHistory,
  blockUser,
  unblockUser,
} from './chat';

// --------- users: dueño de presence y claims ---------
export {
  updateUserRole,
  updateUserStatus,      // <- añadida
  updateUserCertification,
} from './users';

// --------- notifications: sólo las que no chocan ---------
export {
  addInboxNotification,
  getInbox,
  markNotificationsAsRead,
  deleteNotifications,
} from './notifications';

// --------- public: funciones de listados/públicas ---------
export {
  getFeaturedScrims,
  getScrimRankings,
  getTournamentRankings,
  getManagedUsers,
  getFriendProfiles,
} from './public';
