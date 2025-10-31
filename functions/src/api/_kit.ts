import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";

// Wrapper con seguridad por defecto
export function secureCall<TIn>(
  schema: z.ZodType<TIn>,
  handler: (ctx: {
    uid: string;
    claims: Record<string, any>;
    data: TIn;
    db: FirebaseFirestore.Firestore;
    auth: ReturnType<typeof getAuth>;
  }) => Promise<any>
) {
  return onCall(
    {
      region: "europe-west1",
      enforceAppCheck: true,              // App Check obligatorio
      cors: false,                        // onCall maneja CORS
      invoker: "public",                  // solo invocable vía SDK (Auth+AppCheck entran)
      concurrency: 10,                    // opcional: limita concurrencia
      timeoutSeconds: 15,                 // duro pero razonable
    },
    async (req) => {
      if (!req.auth) throw new HttpsError("unauthenticated", "Necesitas iniciar sesión.");
      const claims = (req.auth.token ?? {}) as Record<string, any>;
      const data = schema.parse(req.data);
      const db = getFirestore();
      const auth = getAuth();
      return handler({ uid: req.auth.uid, claims, data, db, auth });
    }
  );
}

export function assertOwner(claims: Record<string, any>) {
  if (claims.role !== "owner") {
    throw new HttpsError("permission-denied", "Solo el owner puede realizar esta acción.");
  }
}
