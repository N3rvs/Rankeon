// functions/src/teams.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { doc } from 'firebase/firestore';

const db = admin.firestore();
const nowTs = () => admin.firestore.FieldValue.serverTimestamp();

// ---------- Helpers ----------
function assertAuth(ctx: any) {
  if (!ctx.auth?.uid) throw new HttpsError('unauthenticated', 'You must be logged in.');
  return ctx.auth.uid as string;
}

async function getMembership(teamId: string, uid: string) {
  const snap = await db
    .collection('teams')
    .doc(teamId)
    .get();
    
  if (!snap.exists) return undefined;
  const teamData = snap.data() as any;
  return teamData?.members?.[uid] ? { role: teamData.members[uid] } : undefined;
}

function assertTeamAdmin(member: any) {
  const role = member?.role ?? 'member';
  const isAdmin = role === 'owner' || role === 'igl' || role === 'admin' || role === 'captain';
  if (!isAdmin) throw new HttpsError('permission-denied', 'Only team admin/IGL/owner can perform this action.');
}

// ---------- Schemas ----------
const CreateTeamSchema = z.object({
  name: z.string().min(3).max(50),
  game: z.string().min(1),
  description: z.string().max(500).optional(),
});

const UpdateTeamSchema = z.object({
  teamId: z.string().min(1),
  name: z.string().min(3).max(50),
  description: z.string().max(500).optional(),
  lookingForPlayers: z.boolean(),
  recruitingRoles: z.array(z.string()).optional(),
  videoUrl: z.string().url().or(z.literal('')).optional(),
  avatarUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
  discordUrl: z.string().url().or(z.literal('')).optional(),
  twitchUrl: z.string().url().or(z.literal('')).optional(),
  twitterUrl: z.string().url().or(z.literal('')).optional(),
  rankMin: z.string().optional(),
  rankMax: z.string().optional(),
});

const DeleteTeamSchema = z.object({ teamId: z.string().min(1) });

const KickSchema = z.object({ teamId: z.string().min(1), memberId: z.string().min(1) });

const SetIglSchema = z.object({ teamId: z.string().min(1), memberId: z.string().nullable() });

const InviteSchema = z.object({ toUserId: z.string().min(1), teamId: z.string().min(1) });

const RespondInviteSchema = z.object({ inviteId: z.string().min(1), accept: z.boolean() });

const ApplySchema = z.object({ teamId: z.string().min(1) });

const RespondApplicationSchema = z.object({ applicationId: z.string().min(1), accept: z.boolean() });

const GetMembersSchema = z.object({ teamId: z.string().min(1) });

const AddTaskSchema = z.object({ teamId: z.string().min(1), title: z.string().min(1).max(120) });

const UpdateTaskStatusSchema = z.object({
  teamId: z.string().min(1),
  taskId: z.string().min(1),
  completed: z.boolean(),
});

const DeleteTaskSchema = z.object({ teamId: z.string().min(1), taskId: z.string().min(1) });

const UpdateSkillsSchema = z.object({
  teamId: z.string().min(1),
  memberId: z.string().min(1),
  skills: z.array(z.string()),
});

// ---------- Functions ----------

export const createTeam = onCall({ region: 'europe-west1' }, async (req) => {
  const uid = assertAuth(req);
  const data = CreateTeamSchema.parse(req.data ?? {});
  const teamRef = db.collection('teams').doc();

  await teamRef.set({
      name: data.name,
      game: data.game,
      description: data.description ?? '',
      ownerId: uid,
      createdAt: nowTs(),
      updatedAt: nowTs(),
      lookingForPlayers: true,
      recruitingRoles: [],
      members: {
        [uid]: 'owner'
      }
    });

  return { success: true, message: 'Equipo creado.', teamId: teamRef.id };
});

export const updateTeam = onCall({ region: 'europe-west1' }, async (req) => {
  const uid = assertAuth(req);
  const data = UpdateTeamSchema.parse(req.data ?? {});
  const member = await getMembership(data.teamId, uid);
  assertTeamAdmin(member);

  const teamRef = db.doc(`teams/${data.teamId}`);
  const update: any = { ...data };
  delete update.teamId;
  update.updatedAt = nowTs();

  await teamRef.set(update, { merge: true });
  return { success: true, message: 'Equipo actualizado.' };
});

export const deleteTeam = onCall({ region: 'europe-west1' }, async (req) => {
  const uid = assertAuth(req);
  const { teamId } = DeleteTeamSchema.parse(req.data ?? {});
  const team = await db.doc(`teams/${teamId}`).get();
  if (!team.exists) throw new HttpsError('not-found', 'Team not found');
  if (team.get('ownerId') !== uid) throw new HttpsError('permission-denied', 'Only owner can delete the team.');

  // Elimina miembros y tareas básicas (simple, no exhaustivo)
  const batch = db.batch();
  const tasks = await db.collection('teamTasks').where('teamId', '==', teamId).get();
  tasks.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(team.ref);
  await batch.commit();

  return { success: true, message: 'Equipo eliminado.' };
});

export const kickTeamMember = onCall({ region: 'europe-west1' }, async (req) => {
  const uid = assertAuth(req);
  const { teamId, memberId } = KickSchema.parse(req.data ?? {});
  const member = await getMembership(teamId, uid);
  assertTeamAdmin(member);

  const teamRef = db.doc(`teams/${teamId}`);
  const teamDoc = await teamRef.get();
  const teamData = teamDoc.data() as any;

  if (memberId === teamData.ownerId) throw new HttpsError('failed-precondition', 'Cannot remove the owner.');
  
  if (teamData.members && teamData.members[memberId]) {
      const newMembers = { ...teamData.members };
      delete newMembers[memberId];
      await teamRef.update({ members: newMembers });
  }

  return { success: true, message: 'Miembro expulsado.' };
});

export const setTeamIGL = onCall({ region: 'europe-west1' }, async (req) => {
  const uid = assertAuth(req);
  const { teamId, memberId } = SetIglSchema.parse(req.data ?? {});
  const member = await getMembership(teamId, uid);
  assertTeamAdmin(member);

  const teamRef = db.doc(`teams/${teamId}`);
  await teamRef.update({ iglId: memberId ?? null, updatedAt: nowTs() });
  return { success: true, message: 'IGL actualizado.' };
});

export const sendTeamInvite = onCall({ region: 'europe-west1' }, async (req) => {
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

export const respondToTeamInvite = onCall({ region: 'europe-west1' }, async (req) => {
  const uid = assertAuth(req);
  const { inviteId, accept } = RespondInviteSchema.parse(req.data ?? {});
  const ref = db.doc(`teamInvites/${inviteId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Invite not found');

  const inv = snap.data() as any;
  if (inv.toUserId !== uid) throw new HttpsError('permission-denied', 'Not your invite');
  if (inv.status !== 'pending') throw new HttpsError('failed-precondition', 'Invite is not pending');

  await db.runTransaction(async (tx) => {
    tx.update(ref, { status: accept ? 'accepted' : 'rejected', updatedAt: nowTs() });
    if (accept) {
      const teamRef = db.doc(`teams/${inv.teamId}`);
      tx.update(teamRef, { [`members.${uid}`]: 'member' });
    }
  });

  return { success: true, message: accept ? 'Invitación aceptada.' : 'Invitación rechazada.' };
});

export const applyToTeam = onCall({ region: 'europe-west1' }, async (req) => {
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

export const respondToTeamApplication = onCall({ region: 'europe-west1' }, async (req) => {
  const uid = assertAuth(req);
  const { applicationId, accept } = RespondApplicationSchema.parse(req.data ?? {});
  const ref = db.doc(`teamApplications/${applicationId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Application not found');

  const app = snap.data() as any;
  const member = await getMembership(app.teamId, uid);
  assertTeamAdmin(member);

  if (app.status !== 'pending') throw new HttpsError('failed-precondition', 'Application is not pending');

  await db.runTransaction(async (tx) => {
    tx.update(ref, { status: accept ? 'accepted' : 'rejected', updatedAt: nowTs() });
    if (accept) {
      const teamRef = db.doc(`teams/${app.teamId}`);
      tx.update(teamRef, { [`members.${app.applicantId}`]: 'member' });
    }
  });

  return { success: true, message: accept ? 'Solicitud aceptada.' : 'Solicitud rechazada.' };
});

export const getTeamMembers = onCall({ region: 'europe-west1' }, async (req) => {
  const { teamId } = GetMembersSchema.parse(req.data ?? {});
  const teamDoc = await db.doc(`teams/${teamId}`).get();
  if (!teamDoc.exists) {
      return [];
  }
  const teamData = teamDoc.data() as any;
  const memberMap = teamData.members || {};
  const memberIds = Object.keys(memberMap);

  if (memberIds.length === 0) {
      return [];
  }

  const userDocs = await Promise.all(memberIds.map(id => db.doc(`users/${id}`).get()));

  const members = userDocs.map(userDoc => {
      if (!userDoc.exists) return null;
      const user = userDoc.data() as any;
      const uid = userDoc.id;
      return {
        id: uid,
        uid: uid,
        role: memberMap[uid] ?? 'member',
        joinedAt: (teamData.createdAt?.toDate?.() ?? null)?.toISOString?.() ?? null,
        displayName: user?.name ?? user?.displayName ?? null,
        avatarUrl: user?.avatarUrl ?? user?.photoURL ?? null,
        isIGL: teamData.iglId === uid,
        skills: user.skills || [],
        isCertifiedStreamer: user.isCertifiedStreamer || false,
      };
  }).filter(Boolean);

  return members;
});

// ---------- Team Tasks ----------
export const addTask = onCall({ region: 'europe-west1' }, async (req) => {
  const uid = assertAuth(req);
  const { teamId, title } = AddTaskSchema.parse(req.data ?? {});
  const member = await getMembership(teamId, uid);
  assertTeamAdmin(member);

  const ref = db.collection('teamTasks').doc();
  await ref.set({ teamId, title, completed: false, createdAt: nowTs(), updatedAt: nowTs() });
  return { success: true, message: 'Task added' };
});

export const updateTaskStatus = onCall({ region: 'europe-west1' }, async (req) => {
  const uid = assertAuth(req);
  const { teamId, taskId, completed } = UpdateTaskStatusSchema.parse(req.data ?? {});
  const member = await getMembership(teamId, uid);
  assertTeamAdmin(member);

  const ref = db.doc(`teamTasks/${taskId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Task not found');
  if (snap.get('teamId') !== teamId) throw new HttpsError('permission-denied', 'Task does not belong to this team');

  await ref.update({ completed, updatedAt: nowTs() });
  return { success: true, message: 'Task updated' };
});

export const deleteTask = onCall({ region: 'europe-west1' }, async (req) => {
  const uid = assertAuth(req);
  const { teamId, taskId } = DeleteTaskSchema.parse(req.data ?? {});
  const member = await getMembership(teamId, uid);
  assertTeamAdmin(member);

  const ref = db.doc(`teamTasks/${taskId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Task not found');
  if (snap.get('teamId') !== teamId) throw new HttpsError('permission-denied', 'Task does not belong to this team');

  await ref.delete();
  return { success: true, message: 'Task deleted' };
});

export const updateMemberSkills = onCall({ region: 'europe-west1' }, async (req) => {
  const uid = assertAuth(req);
  const { teamId, memberId, skills } = UpdateSkillsSchema.parse(req.data ?? {});
  const member = await getMembership(teamId, uid);
  assertTeamAdmin(member);

  const userRef = db.doc(`users/${memberId}`);
  await userRef.update({ skills });

  return { success: true, message: 'Skills updated.' };
});
