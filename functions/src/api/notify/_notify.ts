// api/notify/_notify.ts
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import "../../lib/admin";

export type NotifType =
  | "TEAM_INVITE" | "TEAM_INVITE_ACCEPTED" | "TEAM_INVITE_REJECTED"
  | "TEAM_JOIN_REQUEST" | "TEAM_JOIN_ACCEPTED" | "TEAM_JOIN_REJECTED"
  | "FRIEND_REQUEST" | "FRIEND_ACCEPTED" | "MESSAGE" | "SYSTEM";

export async function createNotification(
  to: string, from: string, type: NotifType, extra: Record<string, any> = {}
) {
  const db = getFirestore();

  // block check
  const blocked = await db.collection("blocks").doc(to).collection("list").doc(from).get();
  if (blocked.exists) return;

  // store inbox item
  const ref = db.collection("notifications").doc(to).collection("items").doc();
  const payload = { id: ref.id, to, from, type, extraData: extra, createdAt: Date.now(), read: false, ttlAt: Date.now() + 30*24*3600*1000 };
  await ref.set(payload);

  // optional push
  try {
    const user = await db.collection("users").doc(to).get();
    const tokens: string[] = (user.get("fcmTokens") ?? []) as string[];
    if (!tokens.length) return;

    const data = Object.fromEntries(Object.entries({ type, ...extra }).map(([k, v]) => [k, String(v)]));

    const chunkSize = 500;
    for (let i = 0; i < tokens.length; i += chunkSize) {
      const chunk = tokens.slice(i, i + chunkSize);
      await getMessaging().sendEachForMulticast({
        tokens: chunk, data,
        android: { priority: "high" },
        apns: { headers: { "apns-priority": "10" } },
      });
    }
  } catch {/* opcional: log */}
}
