// functions/src/index.ts
/* ========= ADMIN ========= */
export * from "./api/admin/setGlobalRole";
export * from "./api/admin/grantFounder";
export * from "./api/admin/getManagedUsers";
export * from "./api/admin/updateUserPresence";
export * from "./api/admin/updateUserStatus";
export * from "./api/admin/adminUpdateUserStatus";

/* ========= HONOR ========= */
export * from "./api/honor/honorGive";
export * from "./api/honor/honorRevoke";
export * from "./api/honor/honorGetRankings";
export * from "./api/honor/honorGetStats";

/* ========= NOTIFY / INBOX ========= */
export * from "./api/notify/inboxAdd";
export * from "./api/notify/inboxMarkRead";
export * from "./api/notify/inboxDelete";
export * from "./api/user/inboxList"; // This one is in user folder

/* ========= MAINTENANCE ========= */
export * from "./api/maintenance/cleanup";
export * from "./api/maintenance/cleanupNotifications";
export * from "./api/maintenance/unbanExpiredUsers";

/* ========= ROOMS ========= */
export * from "./api/rooms/rooms";

/* ========= SCRIMS ========= */
export * from "./api/scrims/challengeScrim";

/* ========= SUPPORT / TICKETS ========= */
export * from "./api/support/tickets";

/* ========= TASKS ========= */
export * from "./api/tasks";

/* ========= TOURNAMENTS ========= */
export * from "./api/tournaments/generateStructure";
export * from "./api/tournaments/reportBracketResult";
export * from "./api/tournaments/reportRoundRobinResult";
export * from "./api/tournaments/registerTeam";
export * from "./api/tournaments/proposeTournament";
export * from "./api/tournaments/reviewProposal";
export * from "./api/tournaments/editTournament";
export * from "./api/tournaments/deleteTournament";

/* ========= RANKINGS ========= */
export * from "./api/rankings/getTorneos";
export * from "./api/rankings/getScrims";
export * from "./api/rankings/getHonores";

/* ========= USER (friends / teams / dm / presence / market) ========= */
export * from "./api/user/dmGetOrCreate";
export * from "./api/user/friendBlock";
export * from "./api/user/friendRemove";
export * from "./api/user/friendRequestRespond";
export * from "./api/user/friendRequestSend";
export * from "./api/user/getFriendProfiles";
export * from "./api/user/userListFriendRequests";
export * from "./api/user/userListFriends";
export * from "./api/user/rtdbPresenceMirror";
export * from "./api/user/teamGenerateInvite";
export * from "./api/user/teamInviteMember";
export * from "./api/user/teamInviteRespond";
export * from "./api/user/teamJoinRequestCreate";
export * from "./api/user/teamJoinRequestRespond";
export * from "./api/user/teamKickMember";
export * from "./api/user/teamSetMemberGameRoles";
export * from "./api/user/teamSetMemberRole";
export * from "./api/user/userCreateTeam";
export * from "./api/user/userDeleteTeam";
export * from "./api/user/userJoinTeamByCode";
export * from "./api/user/userListPlayers";
export * from "./api/user/userListTeams";
