// src/functions/index.ts
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK. This must be done once, at the top.
admin.initializeApp();

// Now import the functions that use the initialized admin SDK.
import { getChats, deleteChatHistory, sendMessageToFriend } from './chat';
import { getFriendProfiles, sendFriendRequest, respondToFriendRequest, removeFriend, getFriendshipStatus } from './friends';
import { giveHonor } from './honors';
import { addInboxNotification, markNotificationsAsRead, deleteNotifications, clearAllNotifications, blockUser, unblockUser } from './notifications';
import { cleanUpOldData } from './cleanup';
import { createGameRoom, joinRoom, leaveRoom, sendMessageToRoom } from './rooms';
import { createScrim, challengeScrim, respondToScrimChallenge, cancelScrim, reportScrimResult } from './scrims';
import { createTeam, updateTeam, deleteTeam, updateTeamMemberRole, kickTeamMember, setTeamIGL, getTeamMembers, sendTeamInvite, respondToTeamInvite, applyToTeam, respondToTeamApplication } from './teams';
import { proposeTournament, reviewTournamentProposal, editTournament, deleteTournament } from './tournaments';
import { createSupportTicket, respondToTicket, resolveTicket } from './tickets';
import { updateUserRole, updateUserStatus, updateUserCertification, updateUserPresence, getManagedUsers } from './users';
import { getMarketPlayers, getMarketTeams, getHonorRankings, getScrimRankings, getTournamentRankings, getFeaturedScrims } from './public';

export {
  getChats,
  deleteChatHistory,
  sendMessageToFriend,
  getFriendProfiles,
  sendFriendRequest,
  respondToFriendRequest,
  removeFriend,
  getFriendshipStatus,
  giveHonor,
  addInboxNotification,
  markNotificationsAsRead,
  deleteNotifications,
  clearAllNotifications,
  blockUser,
  unblockUser,
  cleanUpOldData,
  createGameRoom,
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
  getTeamMembers,
  sendTeamInvite,
  respondToTeamInvite,
  applyToTeam,
  respondToTeamApplication,
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
  updateUserPresence,
  getMarketPlayers,
  getMarketTeams,
  getHonorRankings,
  getScrimRankings,
  getTournamentRankings,
  getFeaturedScrims,
  getManagedUsers
};
