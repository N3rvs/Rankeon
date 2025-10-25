// src/functions/index.ts
import * as admin from 'firebase-admin';
import { setGlobalOptions } from 'firebase-functions/v2';

// Define región global ANTES de inicializar o importar
setGlobalOptions({ region: 'europe-west1' });

// Inicializa SDK
admin.initializeApp();

// --- Importaciones (Añadir las nuevas) ---
import { getChats, deleteChatHistory, sendMessageToFriend } from './chat';
import { getFriendProfiles, sendFriendRequest, respondToFriendRequest, removeFriend, getFriendshipStatus } from './friends';
import { giveHonor, revokeHonor } from './honors';
import { addInboxNotification, markNotificationsAsRead, deleteNotifications, clearAllNotifications, blockUser, unblockUser } from './notifications';
import { cleanUpOldData } from './cleanup';
import { createGameRoom, joinRoom, leaveRoom, sendMessageToRoom } from './rooms';
// *** AÑADIR NUEVAS FUNCIONES DE SCRIMS ***
import { createScrim, acceptScrim, cancelScrim, challengeScrim, respondToScrimChallenge, reportScrimResult } from './scrims';
import { createTeam, updateTeam, deleteTeam, kickTeamMember, setTeamIGL, updateTeamMemberRole, updateMemberSkills } from './teams';
// *** AÑADIR NUEVA FUNCIÓN DE TORNEOS ***
import { proposeTournament, reviewTournamentProposal, editTournament, deleteTournament, registerTeamForTournament } from './tournaments';
import { createSupportTicket, respondToTicket, resolveTicket } from './tickets';
// *** AÑADIR NUEVA FUNCIÓN DE USUARIOS ***
import { updateUserRole, updateUserStatus, updateUserCertification, updateUserPresence } from './users';
import { getMarketPlayers, getMarketTeams, getHonorRankings, getScrimRankings, getTournamentRankings, getFeaturedScrims, getManagedUsers, getTeamMembers } from './public'; // getTeamMembers estaba en public.ts

// --- Exportaciones (Añadir las nuevas) ---
export {
  // Chat
  getChats,
  deleteChatHistory,
  sendMessageToFriend,
  // Friends
  getFriendProfiles,
  sendFriendRequest,
  respondToFriendRequest,
  removeFriend,
  getFriendshipStatus,
  // Honors
  giveHonor,
  revokeHonor,
  // Notifications
  addInboxNotification,
  markNotificationsAsRead,
  deleteNotifications,
  clearAllNotifications,
  blockUser,
  unblockUser,
  // Cleanup
  cleanUpOldData,
  // Rooms
  createGameRoom,
  joinRoom,
  leaveRoom,
  sendMessageToRoom,
  // Scrims (*** AÑADIDAS ***)
  createScrim,
  acceptScrim,
  cancelScrim,
  challengeScrim,
  respondToScrimChallenge,
  reportScrimResult,
  // Teams
  createTeam,
  updateTeam,
  deleteTeam,
  kickTeamMember,
  setTeamIGL,
  updateTeamMemberRole,
  updateMemberSkills,
  // Tournaments (*** AÑADIDA ***)
  proposeTournament,
  reviewTournamentProposal,
  editTournament,
  deleteTournament,
  registerTeamForTournament,
  // Tickets
  createSupportTicket,
  respondToTicket,
  resolveTicket,
  // Users (*** AÑADIDA ***)
  updateUserRole,
  updateUserStatus,
  updateUserCertification,
  updateUserPresence,
  // Public (*** getTeamMembers movida aquí si estaba en public.ts ***)
  getMarketPlayers,
  getMarketTeams,
  getHonorRankings,
  getScrimRankings,
  getTournamentRankings,
  getFeaturedScrims,
  getManagedUsers,
  getTeamMembers // Asegúrate que getTeamMembers se importa desde public.ts si está allí
};