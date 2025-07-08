// src/functions/index.ts
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK. This must be done once, at the top.
admin.initializeApp();

// Now import the functions that use the initialized admin SDK.
import { deleteChatHistory, sendMessageToFriend } from './chat';
import { sendFriendRequest, respondToFriendRequest, removeFriend, getFriendProfiles } from './friends';
import { giveHonor } from './honors';
import { addInboxNotification, markNotificationsAsRead, deleteNotifications, clearAllNotifications, blockUser, unblockUser } from './notifications';
import { cleanUpOldData } from './cleanup';
import { createGameRoomWithDiscord, joinRoom, leaveRoom, sendMessageToRoom } from './rooms';
import { createScrim, challengeScrim, respondToScrimChallenge, cancelScrim, reportScrimResult } from './scrims';
import { createTeam, updateTeam, deleteTeam, updateTeamMemberRole, kickTeamMember, setTeamIGL } from './teams';
import { proposeTournament, reviewTournamentProposal, editTournament, deleteTournament } from './tournaments';
import { createSupportTicket, respondToTicket, resolveTicket } from './tickets';
import { updateUserRole, updateUserStatus, updateUserCertification, updateUserPresence } from './users';

export {
  deleteChatHistory,
  sendMessageToFriend,
  sendFriendRequest,
  respondToFriendRequest,
  removeFriend,
  getFriendProfiles,
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
  challengeScrim,
  respondToScrimChallenge,
  cancelScrim,
  reportScrimResult,
  createTeam,
  updateTeam,
  deleteTeam,
  updateTeamMemberRole,
  kickTeamMember,
  setTeamIGL,
  proposeTournament,
  reviewTournamentProposal,
  editTournament,
  deleteTournament,
  createSupportTicket,
  respondToTicket,
  resolveTicket,
  updateUserRole,
  updateUserStatus,
  updateUserCertification,
  updateUserPresence
};
