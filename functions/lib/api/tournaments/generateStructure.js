"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tournamentsGenerateStructure = exports.MATCH_STATUS = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const _auth_1 = require("./_auth");
// ---- Tipos de estado del match
exports.MATCH_STATUS = ["pending", "awaiting_opponent", "locked", "completed"];
// ---- Handler
exports.tournamentsGenerateStructure = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 30 }, async (req) => {
    const { role } = (0, _auth_1.requireAuth)(req);
    (0, _auth_1.requireModOrAdmin)(role);
    const { tournamentId } = (req.data ?? {});
    if (!tournamentId)
        throw new https_1.HttpsError("invalid-argument", "Falta tournamentId.");
    const db = (0, firestore_1.getFirestore)();
    const tRef = db.doc(`tournaments/${tournamentId}`);
    const tSnap = await tRef.get();
    if (!tSnap.exists)
        throw new https_1.HttpsError("not-found", "Torneo no encontrado.");
    const t = tSnap.data();
    const format = t.format;
    // Equipos registrados
    const teamsSnap = await tRef.collection("teams").get();
    const teams = teamsSnap.docs.map((d) => {
        const x = d.data();
        return {
            id: d.id,
            teamName: x.teamName ?? "",
            teamAvatarUrl: x.teamAvatarUrl ?? null,
            registeredAt: x.registeredAt ?? firestore_1.Timestamp.now(),
        };
    });
    if (teams.length < 2) {
        throw new https_1.HttpsError("failed-precondition", "No hay suficientes equipos.");
    }
    const batch = db.batch();
    if (format === "single-elimination") {
        // Mezclar equipos y crear primera ronda (maneja BYEs)
        const shuffled = [...teams].sort(() => Math.random() - 0.5);
        let currentRoundMatches = [];
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
            const status = hasBye ? "awaiting_opponent" : "pending";
            const data = {
                round: 1,
                teamA,
                teamB,
                nextMatchId: null,
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
                    nextMatchId: null,
                    status: "locked",
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
                    const winnerData = prev.teamA && prev.teamA.id === prev.winnerId ? prev.teamA : prev.teamB;
                    const slot = i % 2 === 0 ? "teamA" : "teamB";
                    const nextMatchRef = tRef.collection("matches").doc(nextId);
                    // estado siguiente según el slot llenado
                    const nextStatus = slot === "teamA" ? "awaiting_opponent" : "pending";
                    batch.update(nextMatchRef, { [slot]: winnerData, status: nextStatus });
                }
            }
            matchesInCurrentRound = Math.ceil(matchesInCurrentRound / 2);
        }
    }
    else if (format === "round-robin") {
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
                    status: "pending",
                    winnerId: null,
                });
            }
        }
    }
    else {
        throw new https_1.HttpsError("unimplemented", `Formato "${format}" no soportado.`);
    }
    batch.update(tRef, {
        status: "ongoing",
        structureGeneratedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    await batch.commit();
    return { success: true, message: `Estructura generada (${format}).` };
});
//# sourceMappingURL=generateStructure.js.map