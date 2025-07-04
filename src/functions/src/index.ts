// src/functions/index.ts
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK. This must be done once, at the top.
admin.initializeApp();

// Now import the functions that use the initialized admin SDK.
import { deleteChatHistory, sendMessageToFriend } from './chat';
import { sendFriendRequest, respondToFriendRequest, removeFriend } from './friends';
import { addInboxNotification, deleteInboxNotification, blockUser, unblockUser } from './notifications';
import { cleanUpOldData } from './cleanup';
import { createGameRoomWithDiscord, joinRoom, leaveRoom, sendMessageToRoom } from './rooms';
import { createTeam, updateTeam, deleteTeam } from './teams';
import { proposeTournamentV2 } from './tournaments';
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
  sendMessageToRoom,
  createTeam,
  updateTeam,
  deleteTeam,
  proposeTournamentV2,
  updateUserRole,
  updateUserStatus,
  updateUserCertification,
  grantFirstAdminRole
};
