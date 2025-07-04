// src/functions/index.ts
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK. This must be done once, at the top.
admin.initializeApp();

// Now import the functions that use the initialized admin SDK.
import { deleteChatHistory, sendMessageToFriend } from './chat';
import { sendFriendRequest, respondToFriendRequest, removeFriend } from './friends';
import { addInboxNotification, deleteInboxNotification, blockUser, unblockUser } from './notifications';
import { cleanUpOldData } from './cleanup';
import { createGameRoomWithDiscord, joinRoom, leaveRoom } from './rooms';
import { createTeam, updateTeam, deleteTeamV2 } from './teams';
import { proposeTournament } from './tournaments';
import { updateUserRole, updateUserStatus, updateUserCertification } from './users';
import { grantFirstAdminRole } from './admin';

export {
  deleteChatHistory,
  sendMessageToFriend,
  sendFriendRequest,
  respondToFriendRequest,
  removeFriend,
  addInboxNotification,
  deleteInboxNotification,
  blockUser,
  unblockUser,
  cleanUpOldData,
  createGameRoomWithDiscord,
  joinRoom,
  leaveRoom,
  createTeam,
  updateTeam,
  deleteTeamV2,
  proposeTournament,
  updateUserRole,
  updateUserStatus,
  updateUserCertification,
  grantFirstAdminRole
};
