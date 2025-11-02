"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userCreateTeam = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const zod_1 = require("zod");
require("../../lib/admin");
const Input = zod_1.z.object({
    name: zod_1.z.string().min(3).max(40),
    slug: zod_1.z.string().min(3).max(30).regex(/^[a-z0-9-]+$/),
    country: zod_1.z.string().length(2),
    region: zod_1.z.string().max(8),
    rank: zod_1.z.number().int().min(0).max(999).default(0),
    rolesWanted: zod_1.z.array(zod_1.z.string()).max(6).default([]),
    isListed: zod_1.z.boolean().default(true),
});
function canCreateTeam(claims) {
    return claims?.isFounder === true || ["owner", "moderator"].includes(claims?.role);
}
exports.userCreateTeam = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Login requerido.");
    if (!canCreateTeam(req.auth.token))
        throw new https_1.HttpsError("permission-denied", "No puedes crear equipos.");
    const d = Input.parse(req.data ?? {});
    const db = (0, firestore_1.getFirestore)();
    const slugRef = db.collection("team_slugs").doc(d.slug);
    const slugDoc = await slugRef.get();
    if (slugDoc.exists)
        throw new https_1.HttpsError("already-exists", "Slug en uso.");
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
//# sourceMappingURL=userCreateTeam.js.map