import { z } from "zod";

export const MatchStatus = ["pending","awaiting_opponent","locked","completed"] as const;

export const ProposeTournamentSchema = z.object({
  name: z.string().min(3).max(80),
  game: z.string().min(1),
  description: z.string().min(10).max(5000),
  proposedDate: z.string().datetime(),
  format: z.enum(["single-elimination","round-robin"]),
  maxTeams: z.number().int().min(2).max(128),
  rankMin: z.string().optional(),
  rankMax: z.string().optional(),
  prize: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
});

export const ReviewTournamentSchema = z.object({
  proposalId: z.string().min(1),
  status: z.enum(["approved","rejected"]),
});

export const EditTournamentSchema = z.object({
  tournamentId: z.string().min(1),
  name: z.string().min(3).max(80).optional(),
  description: z.string().min(10).max(5000).optional(),
  prize: z.number().nonnegative().nullable().optional(),
  currency: z.string().length(3).nullable().optional(),
  rankMin: z.string().nullable().optional(),
  rankMax: z.string().nullable().optional(),
});

export const DeleteTournamentSchema = z.object({
  tournamentId: z.string().min(1),
});

export const RegisterTeamSchema = z.object({
  tournamentId: z.string().min(1),
  teamId: z.string().min(1),
});

export const ReportBracketMatchResultSchema = z.object({
  tournamentId: z.string().min(1),
  matchId: z.string().min(1),
  winnerId: z.string().min(1),
});

export const ReportRoundRobinMatchResultSchema = z.object({
  tournamentId: z.string().min(1),
  matchId: z.string().min(1),
  winnerId: z.string().min(1),
  loserId: z.string().min(1),
});

export type ProposeTournamentData = z.infer<typeof ProposeTournamentSchema>;
export type ReviewTournamentData  = z.infer<typeof ReviewTournamentSchema>;
export type EditTournamentData    = z.infer<typeof EditTournamentSchema>;
export type DeleteTournamentData  = z.infer<typeof DeleteTournamentSchema>;
export type RegisterTeamData      = z.infer<typeof RegisterTeamSchema>;
export type ReportBracketMatchResultData     = z.infer<typeof ReportBracketMatchResultSchema>;
export type ReportRoundRobinMatchResultData  = z.infer<typeof ReportRoundRobinMatchResultSchema>;
