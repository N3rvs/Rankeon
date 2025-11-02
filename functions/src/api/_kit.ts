
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

if (!getApps().length) {
  initializeApp();
}
getFirestore().settings({ ignoreUndefinedProperties: true });

// --- Firebase Functions v2 / Tipos ---
import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { z } from "zod";

// Wrapper con seguridad por defecto (valida input con Zod, exige Auth y App Check)
export function secureCall<TIn>(
  schema: z.ZodType<TIn>,
  handler: (ctx: {
    uid: string;
    claims: Record<string, any>;
    data: TIn;
    db: Firestore;
    auth: ReturnType<typeof getAuth>;
  }) => Promise<any>
) {
  return onCall(
    {
      region: "europe-west1",
      enforceAppCheck: true, // App Check obligatorio
      cors: false,           // onCall maneja CORS
      invoker: "public",     // llamado desde SDK con Auth+AppCheck
      concurrency: 10,
      timeoutSeconds: 15,
    },
    async (req: CallableRequest<unknown>) => {
      if (!req.auth) {
        throw new HttpsError("unauthenticated", "Necesitas iniciar sesión.");
      }

      // Claims seguros + validación del payload
      const claims = (req.auth.token ?? {}) as Record<string, any>;
      const data = schema.parse(req.data as unknown);

      const db = getFirestore();
      const auth = getAuth();

      return handler({ uid: req.auth.uid, claims, data: data as TIn, db, auth });
    }
  );
}

// Helper para rutas solo-owner
export function assertOwner(claims: Record<string, any>) {
  if (claims.role !== "owner") {
    throw new HttpsError("permission-denied", "Solo el owner puede realizar esta acción.");
  }
}

// (Opcional) Otros helpers de rol
export type Role = "owner" | "admin" | "moderator" | "founder" | "coach" | "player";

export function getCallerRole(claims: Record<string, any>): Role {
  return (claims.role ?? "player") as Role;
}

export function isStaff(role: Role) {
  return role === "owner" || role === "admin" || role === "moderator";
}
