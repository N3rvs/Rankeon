import { z } from "zod";
import { secureCall } from "../_kit";
import { HttpsError } from "firebase-functions/v2/https";

export const updateUserStatus = secureCall(
  z.object({ uid: z.string().min(10), disabled: z.boolean(), duration: z.number().int().positive().optional() }),
  async ({ claims, data, auth, db }) => {
    if (!["owner","moderator"].includes(claims.role))
      throw new HttpsError("permission-denied", "No autorizado.");

    await auth.updateUser(data.uid, { disabled: data.disabled });

    const banUntil = data.disabled && data.duration
      ? Date.now() + data.duration * 3600 * 1000
      : null;

    await db.collection("users").doc(data.uid).set(
      { disabled: data.disabled, banUntil }, { merge: true }
    );

    await db.collection("adminLogs").add({
      type: "updateUserStatus", actorUid: claims.user_id, targetUid: data.uid,
      disabled: data.disabled, banUntil, at: Date.now(),
    });

    return { success: true, message: data.disabled ? "Usuario deshabilitado." : "Usuario habilitado." };
  }
);
