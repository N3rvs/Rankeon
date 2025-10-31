import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import "../../lib/admin";
import { requireAuth } from "./_auth";
import { RegisterTeamSchema } from "./_types";

export const tournamentsRegisterTeam = onCall(
  { region:"europe-west1", enforceAppCheck:true, timeoutSeconds:15 },
  async (req) => {
    const { uid } = requireAuth(req);
    const { tournamentId, teamId } = RegisterTeamSchema.parse(req.data ?? {});
    const db = getFirestore();

    const tRef = db.collection("tournaments").doc(tournamentId);
    const teamRef = db.collection("teams").doc(teamId);
    const memberRef = teamRef.collection("members").doc(uid);
    const regRef = tRef.collection("teams").doc(teamId);

    await db.runTransaction(async (tx)=>{
      const [tSnap, teamSnap, memberSnap, regSnap] = await Promise.all([
        tx.get(tRef), tx.get(teamRef), tx.get(memberRef), tx.get(regRef)
      ]);

      if (!tSnap.exists) throw new HttpsError("not-found","Torneo no existe.");
      if (!teamSnap.exists) throw new HttpsError("not-found","Equipo no existe.");
      if (!memberSnap.exists || !["founder","coach"].includes((memberSnap.data() as any)?.role)) {
        throw new HttpsError("permission-denied","Solo founder/coach registra.");
      }
      if (regSnap.exists) throw new HttpsError("already-exists","Equipo ya registrado.");

      const td = tSnap.data() as any;
      if (td.status !== "upcoming") throw new HttpsError("failed-precondition","Torneo no abierto.");

      const regs = await tx.get(tRef.collection("teams").limit(td.maxTeams));
      if (regs.size >= td.maxTeams) throw new HttpsError("failed-precondition","Torneo lleno.");

      tx.set(regRef, {
        teamId,
        teamName: (teamSnap.data() as any)?.name ?? "",
        teamAvatarUrl: (teamSnap.data() as any)?.avatarUrl ?? null,
        registeredAt: Date.now(),
      });
      tx.update(tRef, { registeredTeamsCount: FieldValue.increment(1) });
    });

    return { success:true, message:"Equipo registrado." };
  }
);
