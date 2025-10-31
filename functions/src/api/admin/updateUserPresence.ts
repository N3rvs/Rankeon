import { z } from "zod";
import { secureCall } from "../_kit";

export const updateUserPresence = secureCall(
  z.object({ status: z.enum(["online","away","busy","offline"]) }),
  async ({ uid, data, db }) => {
    await db.collection("users").doc(uid).set(
      { presence: data.status, presenceAt: Date.now() }, { merge: true }
    );
    return { success: true, message: "OK" };
  }
);
