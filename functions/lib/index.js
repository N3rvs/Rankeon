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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFriendProfiles = exports.getManagedUsers = exports.getTournamentRankings = exports.getScrimRankings = exports.getFeaturedScrims = exports.deleteNotifications = exports.markNotificationsAsRead = exports.getInbox = exports.addInboxNotification = exports.updateUserCertification = exports.updateUserStatus = exports.updateUserRole = exports.unblockUser = exports.blockUser = exports.deleteChatHistory = exports.markChatRead = exports.getChatMessages = exports.getChats = exports.sendMessageToFriend = void 0;
const admin = __importStar(require("firebase-admin"));
const v2_1 = require("firebase-functions/v2");
// ===== Opciones globales =====
(0, v2_1.setGlobalOptions)({
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 60,
    maxInstances: 50,
    enforceAppCheck: true, // si tu cliente usa App Check
});
// ===== Inicialización Admin SDK =====
if (admin.apps.length === 0) {
    admin.initializeApp();
    try {
        // Evita errores por campos undefined accidentales
        admin.firestore().settings({ ignoreUndefinedProperties: true });
    }
    catch {
        /* no-op si ya estaba configurado */
    }
}
/* ============================================================
   Re-exports organizados
   - Evitamos `export *` cuando puede haber colisiones.
   - De lo contrario exportamos todo el módulo.
   ============================================================ */
// Módulos “seguros” sin colisiones conocidas
__exportStar(require("./rooms"), exports);
__exportStar(require("./scrims"), exports);
__exportStar(require("./tasks"), exports);
__exportStar(require("./cleanup"), exports);
__exportStar(require("./tickets"), exports);
__exportStar(require("./teams"), exports);
__exportStar(require("./tournaments"), exports);
__exportStar(require("./honors"), exports);
__exportStar(require("./friends"), exports);
// --------- chat: dueño de DMs y bloqueo ---------
var chat_1 = require("./chat");
Object.defineProperty(exports, "sendMessageToFriend", { enumerable: true, get: function () { return chat_1.sendMessageToFriend; } });
Object.defineProperty(exports, "getChats", { enumerable: true, get: function () { return chat_1.getChats; } });
Object.defineProperty(exports, "getChatMessages", { enumerable: true, get: function () { return chat_1.getChatMessages; } });
Object.defineProperty(exports, "markChatRead", { enumerable: true, get: function () { return chat_1.markChatRead; } });
Object.defineProperty(exports, "deleteChatHistory", { enumerable: true, get: function () { return chat_1.deleteChatHistory; } });
Object.defineProperty(exports, "blockUser", { enumerable: true, get: function () { return chat_1.blockUser; } });
Object.defineProperty(exports, "unblockUser", { enumerable: true, get: function () { return chat_1.unblockUser; } });
// --------- users: dueño de presence y claims ---------
var users_1 = require("./users");
Object.defineProperty(exports, "updateUserRole", { enumerable: true, get: function () { return users_1.updateUserRole; } });
Object.defineProperty(exports, "updateUserStatus", { enumerable: true, get: function () { return users_1.updateUserStatus; } });
Object.defineProperty(exports, "updateUserCertification", { enumerable: true, get: function () { return users_1.updateUserCertification; } });
// --------- notifications: sólo las que no chocan ---------
var notifications_1 = require("./notifications");
Object.defineProperty(exports, "addInboxNotification", { enumerable: true, get: function () { return notifications_1.addInboxNotification; } });
Object.defineProperty(exports, "getInbox", { enumerable: true, get: function () { return notifications_1.getInbox; } });
Object.defineProperty(exports, "markNotificationsAsRead", { enumerable: true, get: function () { return notifications_1.markNotificationsAsRead; } });
Object.defineProperty(exports, "deleteNotifications", { enumerable: true, get: function () { return notifications_1.deleteNotifications; } });
// --------- public: funciones de listados/públicas ---------
var public_1 = require("./public");
Object.defineProperty(exports, "getFeaturedScrims", { enumerable: true, get: function () { return public_1.getFeaturedScrims; } });
Object.defineProperty(exports, "getScrimRankings", { enumerable: true, get: function () { return public_1.getScrimRankings; } });
Object.defineProperty(exports, "getTournamentRankings", { enumerable: true, get: function () { return public_1.getTournamentRankings; } });
Object.defineProperty(exports, "getManagedUsers", { enumerable: true, get: function () { return public_1.getManagedUsers; } });
Object.defineProperty(exports, "getFriendProfiles", { enumerable: true, get: function () { return public_1.getFriendProfiles; } });
//# sourceMappingURL=index.js.map