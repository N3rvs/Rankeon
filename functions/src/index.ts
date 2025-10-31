import "./lib/admin";

// ========== Admin ==========
export { setGlobalRole } from "./api/admin/setGlobalRole";
export { grantFounder } from "./api/admin/grantFounder";
export { getManagedUsers } from "./api/admin/getManagedUsers";
export { updateUserPresence } from "./api/admin/updateUserPresence";
export { updateUserStatus } from "./api/admin/updateUserStatus";
// Si tuvieras una callable separada para adminUpdateUserStatus:
export { adminUpdateUserStatus } from "./api/admin/adminUpdateUserStatus";

// ========== Honor ==========
export { honorGive } from "./api/honor/honorGive";
export { honorRevoke } from "./api/honor/honorRevoke";
export { honorGetRankings } from "./api/honor/honorGetRankings";
export { honorGetStats } from "./api/honor/honorGetStats";

// ========== Notify / Inbox ==========
// ========= Notify / Inbox =========
export { inboxAdd }       from "./api/notify/inboxAdd";
export { inboxMarkRead }  from "./api/notify/inboxMarkRead";
export { inboxDelete }    from "./api/notify/inboxDelete";



// ========== Maintenance / Limpiezas ==========
export { nightlyCleanup } from "./api/maintenance/cleanup";
export { cleanupNotifications } from "./api/maintenance/cleanupNotifications";
export { unbanExpiredUsers } from "./api/maintenance/unbanExpiredUsers";

// ========== Rooms / Salas ==========
export {
  roomsCreate,
  roomsJoin,
  roomsLeave,
  roomsSendMessage,
  roomsClose,
  roomsList,
  roomsListMessages,
} from "./api/rooms/rooms";

// ========== Scrims ==========
export { scrimsChallenge } from "./api/scrims/challengeScrim";

// ========== Support / Tickets ==========
export {
  supportCreateTicket,
  supportRespondTicket,
  supportResolveTicket,
  supportListMyTickets,
  supportListAllTickets,
  supportListMessages,
} from "./api/support/tickets";

// ========== Tasks ==========
export {
  taskCreate,
  taskListMine,
  taskUpdate,
  taskDelete,
  subtaskAdd,
  subtaskToggle,
  subtaskDelete,
} from "./api/tasks";

// ========== Tournaments ==========
export { tournamentsGenerateStructure} from "./api/tournaments/generateStructure";
export { tournamentsReportBracketResult } from "./api/tournaments/reportBracketResult";
export { tournamentsReportResult } from "./api/tournaments/reportRoundRobinResult";
export { tournamentsRegisterTeam } from "./api/tournaments/registerTeam";
export { tournamentsPropose } from "./api/tournaments/proposeTournament";
export { tournamentsReviewProposal } from "./api/tournaments/reviewProposal";
export { editTournament } from "./api/tournaments/editTournament";
export { tournamentsDelete } from "./api/tournaments/deleteTournament";

// ========== Rankings / Clasificaciones (si ya las tienes) ==========
export { clasificacionesGetTorneos }  from "./api/rankings/getTorneos";
export { clasificacionesGetScrims }   from "./api/rankings/getScrims";
export { clasificacionesGetHonores }  from "./api/rankings/getHonores";

// ========== User / Market (si existen) ==========
export { userListPlayers } from "./api/user/userListPlayers";
export { userListTeams }   from "./api/user/userListTeams";
