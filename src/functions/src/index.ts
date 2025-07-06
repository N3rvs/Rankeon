
// src/functions/index.ts
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK. This must be done once, at the top.
admin.initializeApp();

// Now import the functions that use the initialized admin SDK.
import { deleteChatHistory, sendMessageToFriend } from './chat';
import { sendFriendRequest, respondToFriendRequest, removeFriend } from './friends';
import { giveHonor } from './honors';
import { addInboxNotification, markNotificationsAsRead, deleteNotifications, clearAllNotifications, blockUser, unblockUser } from './notifications';
import { cleanUpOldData } from './cleanup';
import { createGameRoomWithDiscord, joinRoom, leaveRoom, sendMessageToRoom } from './rooms';
import { createTeam, updateTeam, deleteTeam, updateTeamMemberRole, kickTeamMember, setTeamIGL, sendTeamInvite, respondToTeamInvite, applyToTeam, respondToTeamApplication } from './teams';
import { proposeTournament, reviewTournamentProposal, registerTeamForTournament } from './tournaments';
import { updateUserRole, updateUserStatus, updateUserCertification } from './users';

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
  createTeam,
  updateTeam,
  deleteTeam,
  updateTeamMemberRole,
  kickTeamMember,
  setTeamIGL,
  sendTeamInvite,
  respondToTeamInvite,
  applyToTeam,
  respondToTeamApplication,
  proposeTournament,
  reviewTournamentProposal,
  registerTeamForTournament,
  updateUserRole,
  updateUserStatus,
  updateUserCertification
};
