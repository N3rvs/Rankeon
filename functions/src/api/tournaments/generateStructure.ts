import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { requireAuth, requireModOrAdmin } from "./_auth";

// ---- Tipos de estado del match
export const MATCH_STATUS = ["pending", "awaiting_opponent", "locked", "completed"] as const;
export type MatchStatus = typeof MATCH_STATUS[number];

// ---- Handler
export const tournamentsGenerateStructure = onCall(
  { region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 30 },
  async (req) => {
    const { role } = requireAuth(req);
    requireModOrAdmin(role);

    const { tournamentId } = (req.data ?? {}) as { tournamentId?: string };
    if (!tournamentId) throw new HttpsError("invalid-argument", "Falta tournamentId.");

    const db = getFirestore();
    const tRef = db.doc(`tournaments/${tournamentId}`);
    const tSnap = await tRef.get();
    if (!tSnap.exists) throw new HttpsError("not-found", "Torneo no encontrado.");
    const t = tSnap.data() as any;
    const format = t.format;

    // Equipos registrados
    const teamsSnap = await tRef.collection("teams").get();
    const teams = teamsSnap.docs.map((d) => {
      const x = d.data() as any;
      return {
        id: d.id,
        teamName: x.teamName ?? "",
        teamAvatarUrl: x.teamAvatarUrl ?? null,
        registeredAt: x.registeredAt ?? Timestamp.now(),
      };
    });

    if (teams.length < 2) {
      throw new HttpsError("failed-precondition", "No hay suficientes equipos.");
    }

    const batch = db.batch();

    if (format === "single-elimination") {
      // Mezclar equipos y crear primera ronda (maneja BYEs)
      const shuffled = [...teams].sort(() => Math.random() - 0.5);
      let currentRoundMatches: Array<{
        id: string;
        round: number;
        teamA: any;
        teamB: any;
        nextMatchId: string | null;
        status: MatchStatus;
        winnerId?: string | null;
      }> = [];

      for (let i = 0; i < shuffled.length; i += 2) {
        const matchRef = tRef.collection("matches").doc();

        const teamA = {
          id: shuffled[i].id,
          name: shuffled[i].teamName,
          avatarUrl: shuffled[i].teamAvatarUrl,
        };

        const teamB = shuffled[i + 1]
          ? {
              id: shuffled[i + 1].id,
              name: shuffled[i + 1].teamName,
              avatarUrl: shuffled[i + 1].teamAvatarUrl,
            }
          : null;

        const hasBye = !teamB;

        // ✅ tipado correcto del estado
        const status: MatchStatus = hasBye ? "awaiting_opponent" : "pending";

        const data = {
          round: 1,
          teamA,
          teamB,
          nextMatchId: null as string | null,
          status,
          winnerId: hasBye ? teamA.id : null,
        };

        batch.set(matchRef, data);
        currentRoundMatches.push({ id: matchRef.id, ...data });
      }

      // Construir rondas siguientes encadenando nextMatchId
      let matchesInCurrentRound = currentRoundMatches.length;

      while (matchesInCurrentRound > 1) {
        const previousRoundMatches = [...currentRoundMatches];
        currentRoundMatches = [];

        // Crear partidos de la siguiente ronda
        for (let i = 0; i < matchesInCurrentRound; i += 2) {
          const nextMatchRef = tRef.collection("matches").doc();
          const nextData = {
            round: previousRoundMatches[0].round + 1,
            teamA: null,
            teamB: null,
            nextMatchId: null as string | null,
            status: "locked" as MatchStatus,
          };
          currentRoundMatches.push({ id: nextMatchRef.id, ...nextData });
          batch.set(nextMatchRef, nextData);
        }

        // Ligar previous -> next y propagar BYEs
        for (let i = 0; i < previousRoundMatches.length; i++) {
          const prev = previousRoundMatches[i];
          const nextId = currentRoundMatches[Math.floor(i / 2)].id;

          // enlaza el siguiente partido
          batch.update(tRef.collection("matches").doc(prev.id), { nextMatchId: nextId });

          if (prev.winnerId) {
            const winnerData =
              prev.teamA && prev.teamA.id === prev.winnerId ? prev.teamA : prev.teamB;
            const slot = i % 2 === 0 ? "teamA" : "teamB";
            const nextMatchRef = tRef.collection("matches").doc(nextId);

            // estado siguiente según el slot llenado
            const nextStatus: MatchStatus = slot === "teamA" ? "awaiting_opponent" : "pending";

            batch.update(nextMatchRef, { [slot]: winnerData, status: nextStatus });
          }
        }

        matchesInCurrentRound = Math.ceil(matchesInCurrentRound / 2);
      }
    } else if (format === "round-robin") {
      // Tabla inicial
      for (const tm of teams) {
        const standingRef = tRef.collection("standings").doc(tm.id);
        batch.set(standingRef, {
          teamId: tm.id,
          teamName: tm.teamName,
          teamAvatarUrl: tm.teamAvatarUrl ?? null,
          wins: 0,
          losses: 0,
          draws: 0,
          points: 0,
        });
      }

      // Calendario: todos contra todos
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          const scheduleRef = tRef.collection("schedule").doc();
          batch.set(scheduleRef, {
            teamA: {
              id: teams[i].id,
              name: teams[i].teamName,
              avatarUrl: teams[i].teamAvatarUrl ?? null,
            },
            teamB: {
              id: teams[j].id,
              name: teams[j].teamName,
              avatarUrl: teams[j].teamAvatarUrl ?? null,
            },
            status: "pending" as MatchStatus,
            winnerId: null,
          });
        }
      }
    } else {
      throw new HttpsError("unimplemented", `Formato "${format}" no soportado.`);
    }

    batch.update(tRef, {
      status: "ongoing",
      structureGeneratedAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();
    return { success: true, message: `Estructura generada (${format}).` };
  }
);
