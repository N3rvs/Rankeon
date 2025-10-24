// src/functions/index.ts
import * as admin from 'firebase-admin';
import { setGlobalOptions } from 'firebase-functions/v2';

// 1. DEFINE LA REGIÓN GLOBAL ANTES DE NADA
// Esto forzará que todas las funciones v2 se desplieguen en Europa.
setGlobalOptions({ region: 'europe-west1' });

// 2. Inicializa Firebase Admin SDK (después de setGlobalOptions)
admin.initializeApp();

// 3. Ahora importa todas tus funciones
import { deleteChatHistory, sendMessageToFriend } from './chat';
import { sendFriendRequest, respondToFriendRequest, removeFriend } from './friends';
import { giveHonor } from './honors';
import { addInboxNotification, markNotificationsAsRead, deleteNotifications, clearAllNotifications, blockUser, unblockUser } from './notifications';
import { cleanUpOldData } from './cleanup';
import { createGameRoomWithDiscord, joinRoom, leaveRoom, sendMessageToRoom } from './rooms';
import { createScrim, acceptScrim, cancelScrim } from './scrims';
import { createTeam, updateTeam, deleteTeam, updateTeamMemberRole, kickTeamMember, setTeamIGL } from './teams';
import { proposeTournament, reviewTournamentProposal } from './tournaments';
import { updateUserRole, updateUserStatus, updateUserCertification } from './users';

// 4. Exporta todo como lo tenías
export {
  deleteChatHistory,
  sendMessageToFriend,
  sendFriendRequest,
  respondToFriendRequest,
  removeFriend,
  giveHonor,
  addInboxNotification,
  markNotificationsAsRead,
  deleteNotifications,
  clearAllNotifications,
  blockUser,
  unblockUser,
  cleanUpOldData,
  createGameRoomWithDiscord,
  joinRoom,
  leaveRoom,
  sendMessageToRoom,
  createScrim,
  acceptScrim,
  cancelScrim,
  createTeam,
  updateTeam,
  deleteTeam,
  updateTeamMemberRole,
  kickTeamMember,
  setTeamIGL,
  proposeTournament,
  reviewTournamentProposal,
  updateUserRole,
  updateUserStatus,
  updateUserCertification
};