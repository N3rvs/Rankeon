import { secureCall } from "../_kit";
import { HttpsError } from "firebase-functions/v2/https";

export const getManagedUsers = secureCall(
  // sin payload
  // biome-ignore lint/suspicious/noExplicitAny: simple
  (undefined as any),
  async ({ claims, db }) => {
    if (!["owner","moderator"].includes(claims.role))
      throw new HttpsError("permission-denied", "No autorizado.");

    const snap = await db.collection("users").limit(200).get();
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return { users };
  }
);
