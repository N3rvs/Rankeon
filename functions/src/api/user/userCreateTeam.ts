import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import "../../admin";

const Input = z.object({
  name: z.string().min(3).max(40),
  slug: z.string().min(3).max(30).regex(/^[a-z0-9-]+$/),
  country: z.string().length(2),
  region: z.string().max(8),
  rank: z.number().int().min(0).max(999).default(0),
  rolesWanted: z.array(z.string()).max(6).default([]),
  isListed: z.boolean().default(true),
});

function canCreateTeam(claims: any) {
  return claims?.isFounder === true || ["owner", "moderator"].includes(claims?.role);
}

export const userCreateTeam = onCall({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Login requerido.");
  if (!canCreateTeam(req.auth.token)) throw new HttpsError("permission-denied", "No puedes crear equipos.");

  const d = Input.parse(req.data ?? {});
  const db = getFirestore();

  const slugRef = db.collection("team_slugs").doc(d.slug);
  const slugDoc = await slugRef.get();
  if (slugDoc.exists) throw new HttpsError("already-exists", "Slug en uso.");

  const teamRef = db.collection("teams").doc();
  const batch = db.batch();

  batch.set(slugRef, { teamId: teamRef.id, createdAt: Date.now() });
  batch.set(teamRef, {
    name: d.name,
    slug: d.slug,
    country: d.country,
    region: d.region,
    rank: d.rank,
    rolesWanted: d.rolesWanted,
    isListed: d.isListed,
    ownerUid: req.auth.uid,
    memberCount: 1,
    createdAt: Date.now(),
    name_lc: d.name.toLowerCase(),
  });
  batch.set(teamRef.collection("members").doc(req.auth.uid), {
    uid: req.auth.uid,
    roleInTeam: "owner",
    gameRoles: [],
    joinedAt: Date.now(),
  });

  await batch.commit();
  return { success: true, teamId: teamRef.id, teamPath: `/teams/${d.slug}` };
});
