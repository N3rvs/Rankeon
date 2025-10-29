"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMemberSkills = exports.deleteTask = exports.updateTaskStatus = exports.addTask = exports.getTeamMembers = exports.respondToTeamApplication = exports.applyToTeam = exports.respondToTeamInvite = exports.sendTeamInvite = exports.setTeamIGL = exports.kickTeamMember = exports.deleteTeam = exports.updateTeam = exports.createTeam = void 0;
// functions/src/teams.ts
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const zod_1 = require("zod");
const db = admin.firestore();
const nowTs = () => admin.firestore.FieldValue.serverTimestamp();
// ---------- Helpers ----------
function assertAuth(ctx) {
    if (!ctx.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'You must be logged in.');
    return ctx.auth.uid;
}
async function getMembership(teamId, uid) {
    const snap = await db
        .collection('teamMembers')
        .where('teamId', '==', teamId)
        .where('uid', '==', uid)
        .limit(1)
        .get();
    return snap.docs[0]?.data();
}
function assertTeamAdmin(member) {
    const role = member?.role ?? 'member';
    const isAdmin = role === 'owner' || role === 'igl' || role === 'admin' || role === 'captain';
    if (!isAdmin)
        throw new https_1.HttpsError('permission-denied', 'Only team admin/IGL/owner can perform this action.');
}
// ---------- Schemas ----------
const CreateTeamSchema = zod_1.z.object({
    name: zod_1.z.string().min(3).max(50),
    game: zod_1.z.string().min(1),
    description: zod_1.z.string().max(500).optional(),
});
const UpdateTeamSchema = zod_1.z.object({
    teamId: zod_1.z.string().min(1),
    name: zod_1.z.string().min(3).max(50),
    description: zod_1.z.string().max(500).optional(),
    lookingForPlayers: zod_1.z.boolean(),
    recruitingRoles: zod_1.z.array(zod_1.z.string()).optional(),
    videoUrl: zod_1.z.string().url().or(zod_1.z.literal('')).optional(),
    avatarUrl: zod_1.z.string().url().optional(),
    bannerUrl: zod_1.z.string().url().optional(),
    discordUrl: zod_1.z.string().url().or(zod_1.z.literal('')).optional(),
    twitchUrl: zod_1.z.string().url().or(zod_1.z.literal('')).optional(),
    twitterUrl: zod_1.z.string().url().or(zod_1.z.literal('')).optional(),
    rankMin: zod_1.z.string().optional(),
    rankMax: zod_1.z.string().optional(),
});
const DeleteTeamSchema = zod_1.z.object({ teamId: zod_1.z.string().min(1) });
const KickSchema = zod_1.z.object({ teamId: zod_1.z.string().min(1), memberId: zod_1.z.string().min(1) });
const SetIglSchema = zod_1.z.object({ teamId: zod_1.z.string().min(1), memberId: zod_1.z.string().nullable() });
const InviteSchema = zod_1.z.object({ toUserId: zod_1.z.string().min(1), teamId: zod_1.z.string().min(1) });
const RespondInviteSchema = zod_1.z.object({ inviteId: zod_1.z.string().min(1), accept: zod_1.z.boolean() });
const ApplySchema = zod_1.z.object({ teamId: zod_1.z.string().min(1) });
const RespondApplicationSchema = zod_1.z.object({ applicationId: zod_1.z.string().min(1), accept: zod_1.z.boolean() });
const GetMembersSchema = zod_1.z.object({ teamId: zod_1.z.string().min(1) });
const AddTaskSchema = zod_1.z.object({ teamId: zod_1.z.string().min(1), title: zod_1.z.string().min(1).max(120) });
const UpdateTaskStatusSchema = zod_1.z.object({
    teamId: zod_1.z.string().min(1),
    taskId: zod_1.z.string().min(1),
    completed: zod_1.z.boolean(),
});
const DeleteTaskSchema = zod_1.z.object({ teamId: zod_1.z.string().min(1), taskId: zod_1.z.string().min(1) });
const UpdateSkillsSchema = zod_1.z.object({
    teamId: zod_1.z.string().min(1),
    memberId: zod_1.z.string().min(1),
    skills: zod_1.z.array(zod_1.z.string()),
});
// ---------- Functions ----------
exports.createTeam = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const data = CreateTeamSchema.parse(req.data ?? {});
    const teamRef = db.collection('teams').doc();
    await db.runTransaction(async (tx) => {
        tx.set(teamRef, {
            name: data.name,
            game: data.game,
            description: data.description ?? '',
            ownerId: uid,
            createdAt: nowTs(),
            updatedAt: nowTs(),
            lookingForPlayers: true,
            recruitingRoles: [],
        });
        const memberRef = db.collection('teamMembers').doc();
        tx.set(memberRef, {
            teamId: teamRef.id,
            uid,
            role: 'owner',
            joinedAt: nowTs(),
        });
    });
    return { success: true, message: 'Equipo creado.', teamId: teamRef.id };
});
exports.updateTeam = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const data = UpdateTeamSchema.parse(req.data ?? {});
    const member = await getMembership(data.teamId, uid);
    assertTeamAdmin(member);
    const update = { ...data };
    delete update.teamId;
    update.updatedAt = nowTs();
    await db.doc(`teams/${data.teamId}`).update(update);
    return { success: true, message: 'Equipo actualizado.' };
});
exports.deleteTeam = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { teamId } = DeleteTeamSchema.parse(req.data ?? {});
    const team = await db.doc(`teams/${teamId}`).get();
    if (!team.exists)
        throw new https_1.HttpsError('not-found', 'Team not found');
    if (team.get('ownerId') !== uid)
        throw new https_1.HttpsError('permission-denied', 'Only owner can delete the team.');
    // Elimina miembros y tareas básicas (simple, no exhaustivo)
    const batch = db.batch();
    const members = await db.collection('teamMembers').where('teamId', '==', teamId).get();
    members.docs.forEach((d) => batch.delete(d.ref));
    const tasks = await db.collection('teamTasks').where('teamId', '==', teamId).get();
    tasks.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(team.ref);
    await batch.commit();
    return { success: true, message: 'Equipo eliminado.' };
});
exports.kickTeamMember = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { teamId, memberId } = KickSchema.parse(req.data ?? {});
    const member = await getMembership(teamId, uid);
    assertTeamAdmin(member);
    // No patear al owner
    const ownerId = (await db.doc(`teams/${teamId}`).get()).get('ownerId');
    if (memberId === ownerId)
        throw new https_1.HttpsError('failed-precondition', 'Cannot remove the owner.');
    const snap = await db
        .collection('teamMembers')
        .where('teamId', '==', teamId)
        .where('uid', '==', memberId)
        .limit(1)
        .get();
    if (snap.empty)
        throw new https_1.HttpsError('not-found', 'Member not found.');
    await snap.docs[0].ref.delete();
    return { success: true, message: 'Miembro expulsado.' };
});
exports.setTeamIGL = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { teamId, memberId } = SetIglSchema.parse(req.data ?? {});
    const member = await getMembership(teamId, uid);
    assertTeamAdmin(member);
    const teamRef = db.doc(`teams/${teamId}`);
    await teamRef.update({ iglId: memberId ?? null, updatedAt: nowTs() });
    return { success: true, message: 'IGL actualizado.' };
});
exports.sendTeamInvite = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { toUserId, teamId } = InviteSchema.parse(req.data ?? {});
    const member = await getMembership(teamId, uid);
    assertTeamAdmin(member);
    const inviteRef = db.collection('teamInvites').doc();
    await inviteRef.set({
        teamId,
        toUserId,
        fromUserId: uid,
        status: 'pending',
        createdAt: nowTs(),
        updatedAt: nowTs(),
    });
    return { success: true, message: 'Invitación enviada.' };
});
exports.respondToTeamInvite = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { inviteId, accept } = RespondInviteSchema.parse(req.data ?? {});
    const ref = db.doc(`teamInvites/${inviteId}`);
    const snap = await ref.get();
    if (!snap.exists)
        throw new https_1.HttpsError('not-found', 'Invite not found');
    const inv = snap.data();
    if (inv.toUserId !== uid)
        throw new https_1.HttpsError('permission-denied', 'Not your invite');
    if (inv.status !== 'pending')
        throw new https_1.HttpsError('failed-precondition', 'Invite is not pending');
    await db.runTransaction(async (tx) => {
        tx.update(ref, { status: accept ? 'accepted' : 'rejected', updatedAt: nowTs() });
        if (accept) {
            const mRef = db.collection('teamMembers').doc();
            tx.set(mRef, { teamId: inv.teamId, uid, role: 'member', joinedAt: nowTs() });
        }
    });
    return { success: true, message: accept ? 'Invitación aceptada.' : 'Invitación rechazada.' };
});
exports.applyToTeam = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { teamId } = ApplySchema.parse(req.data ?? {});
    const appRef = db.collection('teamApplications').doc();
    await appRef.set({
        teamId,
        applicantId: uid,
        status: 'pending',
        createdAt: nowTs(),
        updatedAt: nowTs(),
    });
    return { success: true, message: 'Solicitud enviada.' };
});
exports.respondToTeamApplication = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { applicationId, accept } = RespondApplicationSchema.parse(req.data ?? {});
    const ref = db.doc(`teamApplications/${applicationId}`);
    const snap = await ref.get();
    if (!snap.exists)
        throw new https_1.HttpsError('not-found', 'Application not found');
    const app = snap.data();
    const member = await getMembership(app.teamId, uid);
    assertTeamAdmin(member);
    if (app.status !== 'pending')
        throw new https_1.HttpsError('failed-precondition', 'Application is not pending');
    await db.runTransaction(async (tx) => {
        tx.update(ref, { status: accept ? 'accepted' : 'rejected', updatedAt: nowTs() });
        if (accept) {
            const mRef = db.collection('teamMembers').doc();
            tx.set(mRef, { teamId: app.teamId, uid: app.applicantId, role: 'member', joinedAt: nowTs() });
        }
    });
    return { success: true, message: accept ? 'Solicitud aceptada.' : 'Solicitud rechazada.' };
});
exports.getTeamMembers = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const { teamId } = GetMembersSchema.parse(req.data ?? {});
    const q = await db.collection('teamMembers').where('teamId', '==', teamId).get();
    const members = await Promise.all(q.docs.map(async (d) => {
        const m = d.data();
        const user = await db.doc(`users/${m.uid}`).get();
        const u = user.data();
        return {
            id: d.id,
            uid: m.uid,
            role: m.role ?? 'member',
            joinedAt: (m.joinedAt?.toDate?.() ?? null)?.toISOString?.() ?? null,
            displayName: u?.name ?? u?.displayName ?? null,
            avatarUrl: u?.avatarUrl ?? u?.photoURL ?? null,
        };
    }));
    return members; // tu cliente rehidrata Timestamps
});
// ---------- Team Tasks ----------
exports.addTask = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { teamId, title } = AddTaskSchema.parse(req.data ?? {});
    const member = await getMembership(teamId, uid);
    assertTeamAdmin(member);
    const ref = db.collection('teamTasks').doc();
    await ref.set({ teamId, title, completed: false, createdAt: nowTs(), updatedAt: nowTs() });
    return { success: true, message: 'Task added' };
});
exports.updateTaskStatus = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { teamId, taskId, completed } = UpdateTaskStatusSchema.parse(req.data ?? {});
    const member = await getMembership(teamId, uid);
    assertTeamAdmin(member);
    const ref = db.doc(`teamTasks/${taskId}`);
    const snap = await ref.get();
    if (!snap.exists)
        throw new https_1.HttpsError('not-found', 'Task not found');
    if (snap.get('teamId') !== teamId)
        throw new https_1.HttpsError('permission-denied', 'Task does not belong to this team');
    await ref.update({ completed, updatedAt: nowTs() });
    return { success: true, message: 'Task updated' };
});
exports.deleteTask = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { teamId, taskId } = DeleteTaskSchema.parse(req.data ?? {});
    const member = await getMembership(teamId, uid);
    assertTeamAdmin(member);
    const ref = db.doc(`teamTasks/${taskId}`);
    const snap = await ref.get();
    if (!snap.exists)
        throw new https_1.HttpsError('not-found', 'Task not found');
    if (snap.get('teamId') !== teamId)
        throw new https_1.HttpsError('permission-denied', 'Task does not belong to this team');
    await ref.delete();
    return { success: true, message: 'Task deleted' };
});
exports.updateMemberSkills = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { teamId, memberId, skills } = UpdateSkillsSchema.parse(req.data ?? {});
    const member = await getMembership(teamId, uid);
    assertTeamAdmin(member);
    const snap = await db
        .collection('teamMembers')
        .where('teamId', '==', teamId)
        .where('uid', '==', memberId)
        .limit(1)
        .get();
    if (snap.empty)
        throw new https_1.HttpsError('not-found', 'Member not found');
    await snap.docs[0].ref.update({ skills, updatedAt: nowTs() });
    return { success: true, message: 'Skills updated.' };
});
//# sourceMappingURL=teams.js.map