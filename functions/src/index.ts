import { deleteChatHistory, sendMessageToFriend } from './chat';
import { sendFriendRequest, respondToFriendRequest, removeFriend } from './friends';
import {
  acceptTeamInvitation,
  createTeam,
  kickUserFromTeam,
  changeUserRole
} from './teams';
import { addInboxNotification, deleteInboxNotification, blockUser } from './notifications';
import { cleanUpOldData } from './cleanup';

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
  cleanUpOldData,
};
