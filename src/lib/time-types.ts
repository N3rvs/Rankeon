// src/lib/time-types.ts
import { Timestamp } from 'firebase/firestore';

/** Reemplaza recursivamente Firestore Timestamp -> JS Date */
export type ReplaceTimestampsWithDates<T> =
  T extends Timestamp ? Date
  : T extends (infer U)[] ? ReplaceTimestampsWithDates<U>[]
  : T extends object ? { [K in keyof T]: ReplaceTimestampsWithDates<T[K]> }
  : T;

/** Reemplaza recursivamente JS Date -> Firestore Timestamp */
export type ReplaceDatesWithTimestamps<T> =
  T extends Date ? Timestamp
  : T extends (infer U)[] ? ReplaceDatesWithTimestamps<U>[]
  : T extends object ? { [K in keyof T]: ReplaceDatesWithTimestamps<T[K]> }
  : T;

// --- Helpers runtime ---
export const fromDb = <T>(value: T): ReplaceTimestampsWithDates<T> => {
  if (value instanceof Timestamp) return value.toDate() as any;
  if (Array.isArray(value)) return value.map(v => fromDb(v)) as any;
  if (value && typeof value === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(value as any)) out[k] = fromDb(v);
    return out;
  }
  return value as any;
};

export const toDb = <T>(value: ReplaceTimestampsWithDates<T>): T => {
  if (value instanceof Date) return Timestamp.fromDate(value) as any;
  if (Array.isArray(value)) return value.map(v => toDb(v as any)) as any;
  if (value && typeof value === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(value as any)) out[k] = toDb(v as any);
    return out;
  }
  return value as any;
};
