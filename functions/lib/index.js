"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
// functions/src/index.ts
/* ========= ADMIN ========= */
__exportStar(require("./api/admin/setGlobalRole"), exports);
__exportStar(require("./api/admin/grantFounder"), exports);
__exportStar(require("./api/admin/getManagedUsers"), exports);
__exportStar(require("./api/admin/updateUserPresence"), exports);
__exportStar(require("./api/admin/updateUserStatus"), exports);
__exportStar(require("./api/admin/adminUpdateUserStatus"), exports);
/* ========= HONOR ========= */
__exportStar(require("./api/honor/honorGive"), exports);
__exportStar(require("./api/honor/honorRevoke"), exports);
__exportStar(require("./api/honor/honorGetRankings"), exports);
__exportStar(require("./api/honor/honorGetStats"), exports);
/* ========= NOTIFY / INBOX ========= */
__exportStar(require("./api/notify/inboxAdd"), exports);
__exportStar(require("./api/notify/inboxMarkRead"), exports);
__exportStar(require("./api/notify/inboxDelete"), exports);
__exportStar(require("./api/user/inboxList"), exports); // This one is in user folder
/* ========= MAINTENANCE ========= */
__exportStar(require("./api/maintenance/cleanup"), exports);
__exportStar(require("./api/maintenance/cleanupNotifications"), exports);
__exportStar(require("./api/maintenance/unbanExpiredUsers"), exports);
/* ========= ROOMS ========= */
__exportStar(require("./api/rooms/rooms"), exports);
/* ========= SCRIMS ========= */
__exportStar(require("./api/scrims/challengeScrim"), exports);
/* ========= SUPPORT / TICKETS ========= */
__exportStar(require("./api/support/tickets"), exports);
/* ========= TASKS ========= */
__exportStar(require("./api/tasks"), exports);
/* ========= TOURNAMENTS ========= */
__exportStar(require("./api/tournaments/generateStructure"), exports);
__exportStar(require("./api/tournaments/reportBracketResult"), exports);
__exportStar(require("./api/tournaments/reportRoundRobinResult"), exports);
__exportStar(require("./api/tournaments/registerTeam"), exports);
__exportStar(require("./api/tournaments/proposeTournament"), exports);
__exportStar(require("./api/tournaments/reviewProposal"), exports);
__exportStar(require("./api/tournaments/editTournament"), exports);
__exportStar(require("./api/tournaments/deleteTournament"), exports);
/* ========= RANKINGS ========= */
__exportStar(require("./api/rankings/getTorneos"), exports);
__exportStar(require("./api/rankings/getScrims"), exports);
__exportStar(require("./api/rankings/getHonores"), exports);
/* ========= USER (friends / teams / dm / presence / market) ========= */
__exportStar(require("./api/user/dmGetOrCreate"), exports);
__exportStar(require("./api/user/friendBlock"), exports);
__exportStar(require("./api/user/friendRemove"), exports);
__exportStar(require("./api/user/friendRequestRespond"), exports);
__exportStar(require("./api/user/friendRequestSend"), exports);
__exportStar(require("./api/user/getFriendProfiles"), exports);
__exportStar(require("./api/user/userListFriendRequests"), exports);
__exportStar(require("./api/user/userListFriends"), exports);
__exportStar(require("./api/user/rtdbPresenceMirror"), exports);
__exportStar(require("./api/user/teamGenerateInvite"), exports);
__exportStar(require("./api/user/teamInviteMember"), exports);
__exportStar(require("./api/user/teamInviteRespond"), exports);
__exportStar(require("./api/user/teamJoinRequestCreate"), exports);
__exportStar(require("./api/user/teamJoinRequestRespond"), exports);
__exportStar(require("./api/user/teamKickMember"), exports);
__exportStar(require("./api/user/teamSetMemberGameRoles"), exports);
__exportStar(require("./api/user/teamSetMemberRole"), exports);
__exportStar(require("./api/user/userCreateTeam"), exports);
__exportStar(require("./api/user/userDeleteTeam"), exports);
__exportStar(require("./api/user/userJoinTeamByCode"), exports);
__exportStar(require("./api/user/userListPlayers"), exports);
__exportStar(require("./api/user/userListTeams"), exports);
//# sourceMappingURL=index.js.map