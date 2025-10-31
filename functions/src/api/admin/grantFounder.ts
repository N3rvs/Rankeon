import { z } from "zod";
import { secureCall, assertOwner } from "../_kit";

export const grantFounder = secureCall(
  z.object({ uid: z.string().min(10), enabled: z.boolean() }),
  async ({ claims, data, auth, db }) => {
    assertOwner(claims);
    const user = await auth.getUser(data.uid);
    const newClaims = { ...(user.customClaims ?? {}), isFounder: data.enabled };
    await auth.setCustomUserClaims(data.uid, newClaims);
    await db.collection("adminLogs").add({
      type: "grantFounder", actorUid: claims.user_id, targetUid: data.uid,
      enabled: data.enabled, at: Date.now(),
    });
    return { success: true, message: `Founder ${data.enabled ? "activado" : "desactivado"}.` };
  }
);
