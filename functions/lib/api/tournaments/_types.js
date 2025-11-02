"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportRoundRobinMatchResultSchema = exports.ReportBracketMatchResultSchema = exports.RegisterTeamSchema = exports.DeleteTournamentSchema = exports.EditTournamentSchema = exports.ReviewTournamentSchema = exports.ProposeTournamentSchema = exports.MatchStatus = void 0;
const zod_1 = require("zod");
exports.MatchStatus = ["pending", "awaiting_opponent", "locked", "completed"];
exports.ProposeTournamentSchema = zod_1.z.object({
    name: zod_1.z.string().min(3).max(80),
    game: zod_1.z.string().min(1),
    description: zod_1.z.string().min(10).max(5000),
    proposedDate: zod_1.z.string().datetime(),
    format: zod_1.z.enum(["single-elimination", "round-robin"]),
    maxTeams: zod_1.z.number().int().min(2).max(128),
    rankMin: zod_1.z.string().optional(),
    rankMax: zod_1.z.string().optional(),
    prize: zod_1.z.number().nonnegative().optional(),
    currency: zod_1.z.string().length(3).optional(),
});
exports.ReviewTournamentSchema = zod_1.z.object({
    proposalId: zod_1.z.string().min(1),
    status: zod_1.z.enum(["approved", "rejected"]),
});
exports.EditTournamentSchema = zod_1.z.object({
    tournamentId: zod_1.z.string().min(1),
    name: zod_1.z.string().min(3).max(80).optional(),
    description: zod_1.z.string().min(10).max(5000).optional(),
    prize: zod_1.z.number().nonnegative().nullable().optional(),
    currency: zod_1.z.string().length(3).nullable().optional(),
    rankMin: zod_1.z.string().nullable().optional(),
    rankMax: zod_1.z.string().nullable().optional(),
});
exports.DeleteTournamentSchema = zod_1.z.object({
    tournamentId: zod_1.z.string().min(1),
});
exports.RegisterTeamSchema = zod_1.z.object({
    tournamentId: zod_1.z.string().min(1),
    teamId: zod_1.z.string().min(1),
});
exports.ReportBracketMatchResultSchema = zod_1.z.object({
    tournamentId: zod_1.z.string().min(1),
    matchId: zod_1.z.string().min(1),
    winnerId: zod_1.z.string().min(1),
});
exports.ReportRoundRobinMatchResultSchema = zod_1.z.object({
    tournamentId: zod_1.z.string().min(1),
    matchId: zod_1.z.string().min(1),
    winnerId: zod_1.z.string().min(1),
    loserId: zod_1.z.string().min(1),
});
//# sourceMappingURL=_types.js.map