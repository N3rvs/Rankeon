// src/functions/index.ts
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK. This must be done once, at the top.
admin.initializeApp();

// Now import the functions that use the initialized admin SDK.
import { deleteChatHistory, sendMessageToFriend } from './chat';
import { sendFriendRequest, respondToFriendRequest, removeFriend } from './friends';
import {
  acceptTeamInvitation,
  createTeam,
  kickUserFromTeam,
  changeUserRole
} from './teams';
import { addInboxNotification, deleteInboxNotification, blockUser, unblockUser } from './notifications';
import { cleanUpOldData } from './cleanup';
import { createGameRoomWithDiscord } from './rooms';

export {
  deleteChatHistory,
  sendMessageToFriend,
  sendFriendRequest,
  respondToFriendRequest,
  removeFriend,
  acceptTeamInvitation,
  createTeam,
  kickUserFromTeam,
  changeUserRole,
  addInboxNotification,
  deleteInboxNotification,
  blockUser,
  unblockUser,
  cleanUpOldData,
  createGameRoomWithDiscord
};
