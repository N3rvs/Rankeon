// functions/src/api/_options.ts
import { defineSecret } from "firebase-functions/params";

export const OWNER_UID = defineSecret("OWNER_UID");

// opciones comunes
const base = {
  enforceAppCheck: true,
  secrets: [OWNER_UID],
};

// Firestore (tu DB está en west4)
export const w4 = {
  ...base,
  region: "europe-west4" as const,
  timeoutSeconds: 15,
};
export const w4Long = { ...w4, timeoutSeconds: 60 };
export const w4XL = { ...w4, timeoutSeconds: 120 };

// RTDB vive en west1
export const w1 = {
  ...base,
  region: "europe-west1" as const,
  timeoutSeconds: 15,
};
export const w1Long = { ...w1, timeoutSeconds: 60 };
