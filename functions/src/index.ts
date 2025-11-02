// functions/src/index.ts
import "./admin";

/* ========= ADMIN ========= */
export { setGlobalRole }         from "./api/admin/setGlobalRole";
export { grantFounder }          from "./api/admin/grantFounder";
export { getManagedUsers }       from "./api/admin/getManagedUsers";
export { updateUserPresence }    from "./api/admin/updateUserPresence";
export { updateUserStatus }      from "./api/admin/updateUserStatus";
export { adminUpdateUserStatus } from "./api/admin/adminUpdateUserStatus";

/* ========= HONOR ========= */
export { honorGive }        from "./api/honor/honorGive";
export { honorRevoke }      from "./api/honor/honorRevoke";
export { honorGetRankings } from "./api/honor/honorGetRankings";
export { honorGetStats }    from "./api/honor/honorGetStats";

/* ========= NOTIFY / INBOX ========= */
// Tus archivos de notify están en api/notify
export { inboxAdd }      from "./api/notify/inboxAdd";
export { inboxMarkRead } from "./api/notify/inboxMarkRead";
export { inboxDelete }   from "./api/notify/inboxDelete";
// Además tienes un listado de inbox en api/user:
export { inboxList }     from "./api/user/inboxList";

/* ========= MAINTENANCE ========= */
export { nightlyCleanup }       from "./api/maintenance/cleanup";
export { cleanupNotifications } from "./api/maintenance/cleanupNotifications";
export { unbanExpiredUsers }    from "./api/maintenance/unbanExpiredUsers";

/* ========= ROOMS ========= */
export {
   roomsCreate,
  roomsJoin,
   roomsLeave,
roomsSendMessage,
} from "./api/rooms/rooms";

/* ========= SCRIMS ========= */
export { scrimsChallenge } from "./api/scrims/challengeScrim";

/* ========= SUPPORT / TICKETS ========= */
export {
  supportCreateTicket,
  supportRespondTicket,
   supportResolveTicket,
} from "./api/support/tickets";

/* ========= TASKS ========= */
// Tienes index.ts en /api/tasks con estos nombres:
export {
   taskCreate,
   taskListMine,
   taskUpdate,
  taskDelete,
  subtaskAdd,
   subtaskToggle,
} from "./api/tasks";

/* ========= TOURNAMENTS ========= */
// Archivos según tus capturas; alias para nombres consistentes
export {
  tournamentsGenerateStructure,
} from "./api/tournaments/generateStructure";

export {
  tournamentsReportBracketResult,
} from "./api/tournaments/reportBracketResult";

export {
   tournamentsReportResult,
} from "./api/tournaments/reportRoundRobinResult";

export {
  tournamentsRegisterTeam,
} from "./api/tournaments/registerTeam";

export {
  tournamentsPropose,
} from "./api/tournaments/proposeTournament";

export {
 tournamentsReviewProposal,
} from "./api/tournaments/reviewProposal";

export { editTournament } from "./api/tournaments/editTournament";

export {
  tournamentsDelete,
} from "./api/tournaments/deleteTournament";

/* ========= RANKINGS ========= */
export {  clasificacionesGetTorneos }  from "./api/rankings/getTorneos";
export {  clasificacionesGetScrims }   from "./api/rankings/getScrims";
export { clasificacionesGetHonores }  from "./api/rankings/getHonores";

/* ========= USER (friends / teams / dm / presence / market) ========= */
// DM
export { dmGetOrCreate } from "./api/user/dmGetOrCreate";

// Friends
export { friendBlock }             from "./api/user/friendBlock";
export { friendRemove }            from "./api/user/friendRemove";
export { friendRequestRespond }    from "./api/user/friendRequestRespond";
export { friendRequestSend }       from "./api/user/friendRequestSend";
export { userListFriendsWithProfiles }       from "./api/user/getFriendProfiles";
export { userListFriendRequests }  from "./api/user/userListFriendRequests";
export { userListFriends }         from "./api/user/userListFriends";

// Presence
export { rtdbPresenceMirror } from "./api/user/rtdbPresenceMirror";

// Teams: invites / join / members / roles
export { teamGenerateInvite }       from "./api/user/teamGenerateInvite";
export { teamInviteMember }         from "./api/user/teamInviteMember";
export { teamInviteRespond }        from "./api/user/teamInviteRespond";
export { teamJoinRequestCreate }    from "./api/user/teamJoinRequestCreate";
export { teamJoinRequestRespond }   from "./api/user/teamJoinRequestRespond";
export { teamKickMember }           from "./api/user/teamKickMember";
export { teamSetMemberGameRoles }   from "./api/user/teamSetMemberGameRoles";
export { teamSetMemberRole }        from "./api/user/teamSetMemberRole";

// Teams: create / delete / join by code
export { userCreateTeam }   from "./api/user/userCreateTeam";
export { userDeleteTeam }   from "./api/user/userDeleteTeam";
export { userJoinTeamByCode } from "./api/user/userJoinTeamByCode";

// Market
export { userListPlayers } from "./api/user/userListPlayers";
export { userListTeams }   from "./api/user/userListTeams";
