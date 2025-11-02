"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userListFriends = exports.userListFriendRequests = exports.userListFriendsWithProfiles = exports.friendRequestSend = exports.friendRequestRespond = exports.friendRemove = exports.friendBlock = exports.dmGetOrCreate = exports.clasificacionesGetHonores = exports.clasificacionesGetScrims = exports.clasificacionesGetTorneos = exports.tournamentsDelete = exports.editTournament = exports.tournamentsReviewProposal = exports.tournamentsPropose = exports.tournamentsRegisterTeam = exports.tournamentsReportResult = exports.tournamentsReportBracketResult = exports.tournamentsGenerateStructure = exports.subtaskToggle = exports.subtaskAdd = exports.taskDelete = exports.taskUpdate = exports.taskListMine = exports.taskCreate = exports.supportResolveTicket = exports.supportRespondTicket = exports.supportCreateTicket = exports.scrimsChallenge = exports.roomsSendMessage = exports.roomsLeave = exports.roomsJoin = exports.roomsCreate = exports.unbanExpiredUsers = exports.cleanupNotifications = exports.nightlyCleanup = exports.inboxList = exports.inboxDelete = exports.inboxMarkRead = exports.inboxAdd = exports.honorGetStats = exports.honorGetRankings = exports.honorRevoke = exports.honorGive = exports.adminUpdateUserStatus = exports.updateUserStatus = exports.updateUserPresence = exports.getManagedUsers = exports.grantFounder = exports.setGlobalRole = void 0;
exports.userListTeams = exports.userListPlayers = exports.userJoinTeamByCode = exports.userDeleteTeam = exports.userCreateTeam = exports.teamSetMemberRole = exports.teamSetMemberGameRoles = exports.teamKickMember = exports.teamJoinRequestRespond = exports.teamJoinRequestCreate = exports.teamInviteRespond = exports.teamInviteMember = exports.teamGenerateInvite = exports.rtdbPresenceMirror = void 0;
// functions/src/index.ts
require("./lib/admin");
/* ========= ADMIN ========= */
var setGlobalRole_1 = require("./api/admin/setGlobalRole");
Object.defineProperty(exports, "setGlobalRole", { enumerable: true, get: function () { return setGlobalRole_1.setGlobalRole; } });
var grantFounder_1 = require("./api/admin/grantFounder");
Object.defineProperty(exports, "grantFounder", { enumerable: true, get: function () { return grantFounder_1.grantFounder; } });
var getManagedUsers_1 = require("./api/admin/getManagedUsers");
Object.defineProperty(exports, "getManagedUsers", { enumerable: true, get: function () { return getManagedUsers_1.getManagedUsers; } });
var updateUserPresence_1 = require("./api/admin/updateUserPresence");
Object.defineProperty(exports, "updateUserPresence", { enumerable: true, get: function () { return updateUserPresence_1.updateUserPresence; } });
var updateUserStatus_1 = require("./api/admin/updateUserStatus");
Object.defineProperty(exports, "updateUserStatus", { enumerable: true, get: function () { return updateUserStatus_1.updateUserStatus; } });
var adminUpdateUserStatus_1 = require("./api/admin/adminUpdateUserStatus");
Object.defineProperty(exports, "adminUpdateUserStatus", { enumerable: true, get: function () { return adminUpdateUserStatus_1.adminUpdateUserStatus; } });
/* ========= HONOR ========= */
var honorGive_1 = require("./api/honor/honorGive");
Object.defineProperty(exports, "honorGive", { enumerable: true, get: function () { return honorGive_1.honorGive; } });
var honorRevoke_1 = require("./api/honor/honorRevoke");
Object.defineProperty(exports, "honorRevoke", { enumerable: true, get: function () { return honorRevoke_1.honorRevoke; } });
var honorGetRankings_1 = require("./api/honor/honorGetRankings");
Object.defineProperty(exports, "honorGetRankings", { enumerable: true, get: function () { return honorGetRankings_1.honorGetRankings; } });
var honorGetStats_1 = require("./api/honor/honorGetStats");
Object.defineProperty(exports, "honorGetStats", { enumerable: true, get: function () { return honorGetStats_1.honorGetStats; } });
/* ========= NOTIFY / INBOX ========= */
// Tus archivos de notify están en api/notify
var inboxAdd_1 = require("./api/notify/inboxAdd");
Object.defineProperty(exports, "inboxAdd", { enumerable: true, get: function () { return inboxAdd_1.inboxAdd; } });
var inboxMarkRead_1 = require("./api/notify/inboxMarkRead");
Object.defineProperty(exports, "inboxMarkRead", { enumerable: true, get: function () { return inboxMarkRead_1.inboxMarkRead; } });
var inboxDelete_1 = require("./api/notify/inboxDelete");
Object.defineProperty(exports, "inboxDelete", { enumerable: true, get: function () { return inboxDelete_1.inboxDelete; } });
// Además tienes un listado de inbox en api/user:
var inboxList_1 = require("./api/user/inboxList");
Object.defineProperty(exports, "inboxList", { enumerable: true, get: function () { return inboxList_1.inboxList; } });
/* ========= MAINTENANCE ========= */
var cleanup_1 = require("./api/maintenance/cleanup");
Object.defineProperty(exports, "nightlyCleanup", { enumerable: true, get: function () { return cleanup_1.nightlyCleanup; } });
var cleanupNotifications_1 = require("./api/maintenance/cleanupNotifications");
Object.defineProperty(exports, "cleanupNotifications", { enumerable: true, get: function () { return cleanupNotifications_1.cleanupNotifications; } });
var unbanExpiredUsers_1 = require("./api/maintenance/unbanExpiredUsers");
Object.defineProperty(exports, "unbanExpiredUsers", { enumerable: true, get: function () { return unbanExpiredUsers_1.unbanExpiredUsers; } });
/* ========= ROOMS ========= */
var rooms_1 = require("./api/rooms/rooms");
Object.defineProperty(exports, "roomsCreate", { enumerable: true, get: function () { return rooms_1.roomsCreate; } });
Object.defineProperty(exports, "roomsJoin", { enumerable: true, get: function () { return rooms_1.roomsJoin; } });
Object.defineProperty(exports, "roomsLeave", { enumerable: true, get: function () { return rooms_1.roomsLeave; } });
Object.defineProperty(exports, "roomsSendMessage", { enumerable: true, get: function () { return rooms_1.roomsSendMessage; } });
/* ========= SCRIMS ========= */
var challengeScrim_1 = require("./api/scrims/challengeScrim");
Object.defineProperty(exports, "scrimsChallenge", { enumerable: true, get: function () { return challengeScrim_1.scrimsChallenge; } });
/* ========= SUPPORT / TICKETS ========= */
var tickets_1 = require("./api/support/tickets");
Object.defineProperty(exports, "supportCreateTicket", { enumerable: true, get: function () { return tickets_1.supportCreateTicket; } });
Object.defineProperty(exports, "supportRespondTicket", { enumerable: true, get: function () { return tickets_1.supportRespondTicket; } });
Object.defineProperty(exports, "supportResolveTicket", { enumerable: true, get: function () { return tickets_1.supportResolveTicket; } });
/* ========= TASKS ========= */
// Tienes index.ts en /api/tasks con estos nombres:
var tasks_1 = require("./api/tasks");
Object.defineProperty(exports, "taskCreate", { enumerable: true, get: function () { return tasks_1.taskCreate; } });
Object.defineProperty(exports, "taskListMine", { enumerable: true, get: function () { return tasks_1.taskListMine; } });
Object.defineProperty(exports, "taskUpdate", { enumerable: true, get: function () { return tasks_1.taskUpdate; } });
Object.defineProperty(exports, "taskDelete", { enumerable: true, get: function () { return tasks_1.taskDelete; } });
Object.defineProperty(exports, "subtaskAdd", { enumerable: true, get: function () { return tasks_1.subtaskAdd; } });
Object.defineProperty(exports, "subtaskToggle", { enumerable: true, get: function () { return tasks_1.subtaskToggle; } });
/* ========= TOURNAMENTS ========= */
// Archivos según tus capturas; alias para nombres consistentes
var generateStructure_1 = require("./api/tournaments/generateStructure");
Object.defineProperty(exports, "tournamentsGenerateStructure", { enumerable: true, get: function () { return generateStructure_1.tournamentsGenerateStructure; } });
var reportBracketResult_1 = require("./api/tournaments/reportBracketResult");
Object.defineProperty(exports, "tournamentsReportBracketResult", { enumerable: true, get: function () { return reportBracketResult_1.tournamentsReportBracketResult; } });
var reportRoundRobinResult_1 = require("./api/tournaments/reportRoundRobinResult");
Object.defineProperty(exports, "tournamentsReportResult", { enumerable: true, get: function () { return reportRoundRobinResult_1.tournamentsReportResult; } });
var registerTeam_1 = require("./api/tournaments/registerTeam");
Object.defineProperty(exports, "tournamentsRegisterTeam", { enumerable: true, get: function () { return registerTeam_1.tournamentsRegisterTeam; } });
var proposeTournament_1 = require("./api/tournaments/proposeTournament");
Object.defineProperty(exports, "tournamentsPropose", { enumerable: true, get: function () { return proposeTournament_1.tournamentsPropose; } });
var reviewProposal_1 = require("./api/tournaments/reviewProposal");
Object.defineProperty(exports, "tournamentsReviewProposal", { enumerable: true, get: function () { return reviewProposal_1.tournamentsReviewProposal; } });
var editTournament_1 = require("./api/tournaments/editTournament");
Object.defineProperty(exports, "editTournament", { enumerable: true, get: function () { return editTournament_1.editTournament; } });
var deleteTournament_1 = require("./api/tournaments/deleteTournament");
Object.defineProperty(exports, "tournamentsDelete", { enumerable: true, get: function () { return deleteTournament_1.tournamentsDelete; } });
/* ========= RANKINGS ========= */
var getTorneos_1 = require("./api/rankings/getTorneos");
Object.defineProperty(exports, "clasificacionesGetTorneos", { enumerable: true, get: function () { return getTorneos_1.clasificacionesGetTorneos; } });
var getScrims_1 = require("./api/rankings/getScrims");
Object.defineProperty(exports, "clasificacionesGetScrims", { enumerable: true, get: function () { return getScrims_1.clasificacionesGetScrims; } });
var getHonores_1 = require("./api/rankings/getHonores");
Object.defineProperty(exports, "clasificacionesGetHonores", { enumerable: true, get: function () { return getHonores_1.clasificacionesGetHonores; } });
/* ========= USER (friends / teams / dm / presence / market) ========= */
// DM
var dmGetOrCreate_1 = require("./api/user/dmGetOrCreate");
Object.defineProperty(exports, "dmGetOrCreate", { enumerable: true, get: function () { return dmGetOrCreate_1.dmGetOrCreate; } });
// Friends
var friendBlock_1 = require("./api/user/friendBlock");
Object.defineProperty(exports, "friendBlock", { enumerable: true, get: function () { return friendBlock_1.friendBlock; } });
var friendRemove_1 = require("./api/user/friendRemove");
Object.defineProperty(exports, "friendRemove", { enumerable: true, get: function () { return friendRemove_1.friendRemove; } });
var friendRequestRespond_1 = require("./api/user/friendRequestRespond");
Object.defineProperty(exports, "friendRequestRespond", { enumerable: true, get: function () { return friendRequestRespond_1.friendRequestRespond; } });
var friendRequestSend_1 = require("./api/user/friendRequestSend");
Object.defineProperty(exports, "friendRequestSend", { enumerable: true, get: function () { return friendRequestSend_1.friendRequestSend; } });
var getFriendProfiles_1 = require("./api/user/getFriendProfiles");
Object.defineProperty(exports, "userListFriendsWithProfiles", { enumerable: true, get: function () { return getFriendProfiles_1.userListFriendsWithProfiles; } });
var userListFriendRequests_1 = require("./api/user/userListFriendRequests");
Object.defineProperty(exports, "userListFriendRequests", { enumerable: true, get: function () { return userListFriendRequests_1.userListFriendRequests; } });
var userListFriends_1 = require("./api/user/userListFriends");
Object.defineProperty(exports, "userListFriends", { enumerable: true, get: function () { return userListFriends_1.userListFriends; } });
// Presence
var rtdbPresenceMirror_1 = require("./api/user/rtdbPresenceMirror");
Object.defineProperty(exports, "rtdbPresenceMirror", { enumerable: true, get: function () { return rtdbPresenceMirror_1.rtdbPresenceMirror; } });
// Teams: invites / join / members / roles
var teamGenerateInvite_1 = require("./api/user/teamGenerateInvite");
Object.defineProperty(exports, "teamGenerateInvite", { enumerable: true, get: function () { return teamGenerateInvite_1.teamGenerateInvite; } });
var teamInviteMember_1 = require("./api/user/teamInviteMember");
Object.defineProperty(exports, "teamInviteMember", { enumerable: true, get: function () { return teamInviteMember_1.teamInviteMember; } });
var teamInviteRespond_1 = require("./api/user/teamInviteRespond");
Object.defineProperty(exports, "teamInviteRespond", { enumerable: true, get: function () { return teamInviteRespond_1.teamInviteRespond; } });
var teamJoinRequestCreate_1 = require("./api/user/teamJoinRequestCreate");
Object.defineProperty(exports, "teamJoinRequestCreate", { enumerable: true, get: function () { return teamJoinRequestCreate_1.teamJoinRequestCreate; } });
var teamJoinRequestRespond_1 = require("./api/user/teamJoinRequestRespond");
Object.defineProperty(exports, "teamJoinRequestRespond", { enumerable: true, get: function () { return teamJoinRequestRespond_1.teamJoinRequestRespond; } });
var teamKickMember_1 = require("./api/user/teamKickMember");
Object.defineProperty(exports, "teamKickMember", { enumerable: true, get: function () { return teamKickMember_1.teamKickMember; } });
var teamSetMemberGameRoles_1 = require("./api/user/teamSetMemberGameRoles");
Object.defineProperty(exports, "teamSetMemberGameRoles", { enumerable: true, get: function () { return teamSetMemberGameRoles_1.teamSetMemberGameRoles; } });
var teamSetMemberRole_1 = require("./api/user/teamSetMemberRole");
Object.defineProperty(exports, "teamSetMemberRole", { enumerable: true, get: function () { return teamSetMemberRole_1.teamSetMemberRole; } });
// Teams: create / delete / join by code
var userCreateTeam_1 = require("./api/user/userCreateTeam");
Object.defineProperty(exports, "userCreateTeam", { enumerable: true, get: function () { return userCreateTeam_1.userCreateTeam; } });
var userDeleteTeam_1 = require("./api/user/userDeleteTeam");
Object.defineProperty(exports, "userDeleteTeam", { enumerable: true, get: function () { return userDeleteTeam_1.userDeleteTeam; } });
var userJoinTeamByCode_1 = require("./api/user/userJoinTeamByCode");
Object.defineProperty(exports, "userJoinTeamByCode", { enumerable: true, get: function () { return userJoinTeamByCode_1.userJoinTeamByCode; } });
// Market
var userListPlayers_1 = require("./api/user/userListPlayers");
Object.defineProperty(exports, "userListPlayers", { enumerable: true, get: function () { return userListPlayers_1.userListPlayers; } });
var userListTeams_1 = require("./api/user/userListTeams");
Object.defineProperty(exports, "userListTeams", { enumerable: true, get: function () { return userListTeams_1.userListTeams; } });
//# sourceMappingURL=index.js.map