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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserCertification = exports.updateUserStatus = exports.updateUserRole = exports.reviewTournamentProposal = exports.proposeTournament = exports.setTeamIGL = exports.kickTeamMember = exports.updateTeamMemberRole = exports.deleteTeam = exports.updateTeam = exports.createTeam = exports.cancelScrim = exports.acceptScrim = exports.createScrim = exports.sendMessageToRoom = exports.leaveRoom = exports.joinRoom = exports.createGameRoomWithDiscord = exports.cleanUpOldData = exports.unblockUser = exports.blockUser = exports.clearAllNotifications = exports.deleteNotifications = exports.markNotificationsAsRead = exports.addInboxNotification = exports.giveHonor = exports.removeFriend = exports.respondToFriendRequest = exports.sendFriendRequest = exports.sendMessageToFriend = exports.deleteChatHistory = void 0;
// src/functions/index.ts
const admin = __importStar(require("firebase-admin"));
const v2_1 = require("firebase-functions/v2");
// 1. DEFINE LA REGIÓN GLOBAL ANTES DE NADA
// Esto forzará que todas las funciones v2 se desplieguen en Europa.
(0, v2_1.setGlobalOptions)({ region: 'europe-west1' });
// 2. Inicializa Firebase Admin SDK (después de setGlobalOptions)
admin.initializeApp();
// 3. Ahora importa todas tus funciones
const chat_1 = require("./chat");
Object.defineProperty(exports, "deleteChatHistory", { enumerable: true, get: function () { return chat_1.deleteChatHistory; } });
Object.defineProperty(exports, "sendMessageToFriend", { enumerable: true, get: function () { return chat_1.sendMessageToFriend; } });
const friends_1 = require("./friends");
Object.defineProperty(exports, "sendFriendRequest", { enumerable: true, get: function () { return friends_1.sendFriendRequest; } });
Object.defineProperty(exports, "respondToFriendRequest", { enumerable: true, get: function () { return friends_1.respondToFriendRequest; } });
Object.defineProperty(exports, "removeFriend", { enumerable: true, get: function () { return friends_1.removeFriend; } });
const honors_1 = require("./honors");
Object.defineProperty(exports, "giveHonor", { enumerable: true, get: function () { return honors_1.giveHonor; } });
const notifications_1 = require("./notifications");
Object.defineProperty(exports, "addInboxNotification", { enumerable: true, get: function () { return notifications_1.addInboxNotification; } });
Object.defineProperty(exports, "markNotificationsAsRead", { enumerable: true, get: function () { return notifications_1.markNotificationsAsRead; } });
Object.defineProperty(exports, "deleteNotifications", { enumerable: true, get: function () { return notifications_1.deleteNotifications; } });
Object.defineProperty(exports, "clearAllNotifications", { enumerable: true, get: function () { return notifications_1.clearAllNotifications; } });
Object.defineProperty(exports, "blockUser", { enumerable: true, get: function () { return notifications_1.blockUser; } });
Object.defineProperty(exports, "unblockUser", { enumerable: true, get: function () { return notifications_1.unblockUser; } });
const cleanup_1 = require("./cleanup");
Object.defineProperty(exports, "cleanUpOldData", { enumerable: true, get: function () { return cleanup_1.cleanUpOldData; } });
const rooms_1 = require("./rooms");
Object.defineProperty(exports, "createGameRoomWithDiscord", { enumerable: true, get: function () { return rooms_1.createGameRoomWithDiscord; } });
Object.defineProperty(exports, "joinRoom", { enumerable: true, get: function () { return rooms_1.joinRoom; } });
Object.defineProperty(exports, "leaveRoom", { enumerable: true, get: function () { return rooms_1.leaveRoom; } });
Object.defineProperty(exports, "sendMessageToRoom", { enumerable: true, get: function () { return rooms_1.sendMessageToRoom; } });
const scrims_1 = require("./scrims");
Object.defineProperty(exports, "createScrim", { enumerable: true, get: function () { return scrims_1.createScrim; } });
Object.defineProperty(exports, "acceptScrim", { enumerable: true, get: function () { return scrims_1.acceptScrim; } });
Object.defineProperty(exports, "cancelScrim", { enumerable: true, get: function () { return scrims_1.cancelScrim; } });
const teams_1 = require("./teams");
Object.defineProperty(exports, "createTeam", { enumerable: true, get: function () { return teams_1.createTeam; } });
Object.defineProperty(exports, "updateTeam", { enumerable: true, get: function () { return teams_1.updateTeam; } });
Object.defineProperty(exports, "deleteTeam", { enumerable: true, get: function () { return teams_1.deleteTeam; } });
Object.defineProperty(exports, "updateTeamMemberRole", { enumerable: true, get: function () { return teams_1.updateTeamMemberRole; } });
Object.defineProperty(exports, "kickTeamMember", { enumerable: true, get: function () { return teams_1.kickTeamMember; } });
Object.defineProperty(exports, "setTeamIGL", { enumerable: true, get: function () { return teams_1.setTeamIGL; } });
const tournaments_1 = require("./tournaments");
Object.defineProperty(exports, "proposeTournament", { enumerable: true, get: function () { return tournaments_1.proposeTournament; } });
Object.defineProperty(exports, "reviewTournamentProposal", { enumerable: true, get: function () { return tournaments_1.reviewTournamentProposal; } });
const users_1 = require("./users");
Object.defineProperty(exports, "updateUserRole", { enumerable: true, get: function () { return users_1.updateUserRole; } });
Object.defineProperty(exports, "updateUserStatus", { enumerable: true, get: function () { return users_1.updateUserStatus; } });
Object.defineProperty(exports, "updateUserCertification", { enumerable: true, get: function () { return users_1.updateUserCertification; } });
//# sourceMappingURL=index.js.map