// functions/src/api/_options.ts
import { defineSecret } from "firebase-functions/params";
import type { CallableOptions } from "firebase-functions/v2/https";

export const OWNER_UID = defineSecret("OWNER_UID");

// No uses `as const` aquí
const common = {
  region: "europe-west4",
  enforceAppCheck: true,
  secrets: [OWNER_UID], // inferencia OK, no importes SecretParam
};

export const defaultOpts: CallableOptions = {
  ...common,
  timeoutSeconds: 15,
};

export const longOpts: CallableOptions = {
  ...common,
  timeoutSeconds: 60,
};

export const longTimeoutOpts: CallableOptions = {
  ...common,
  timeoutSeconds: 120,
};
