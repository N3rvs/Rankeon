import { z } from "zod";
import { secureCall, assertOwner } from "../_kit";

export const setGlobalRole = secureCall(
  z.object({ uid: z.string().min(10), role: z.enum(["moderator","user"]) }),
  async ({ claims, data, auth, db }) => {
    assertOwner(claims);
    const user = await auth.getUser(data.uid);
    const newClaims = { ...(user.customClaims ?? {}), role: data.role };
    await auth.setCustomUserClaims(data.uid, newClaims);
    await db.collection("adminLogs").add({
      type: "setGlobalRole", actorUid: claims.user_id, targetUid: data.uid,
      newRole: data.role, at: Date.now(),
    });
    return { success: true, message: "Rol actualizado." };
  }
);
