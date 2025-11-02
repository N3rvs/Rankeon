import { HttpsError } from "firebase-functions/v2/https";

export type Role = "owner" | "admin" | "moderator" | "founder" | "coach" | "player";

export function requireAuth(req: any) {
  if (!req.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  const role = ((req.auth.token as any)?.role ?? "player") as Role;
  const isCertifiedStreamer = Boolean((req.auth.token as any)?.isCertifiedStreamer);
  return { uid: req.auth.uid as string, role, isCertifiedStreamer };
}

// ---- helpers de autorización ----
export function isStaff(role: Role) {
  return role === "owner" || role === "admin" || role === "moderator";
}

export function requireStaff(role: Role) {
  if (!isStaff(role)) {
    throw new HttpsError("permission-denied", "No autorizado (staff solamente).");
  }
}

export function requireModOrAdmin(role: Role) {
  if (!(role === "admin" || role === "moderator")) {
    throw new HttpsError("permission-denied", "No autorizado (admin/mod).");
  }
}
