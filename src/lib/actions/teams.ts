<<<<<<< Updated upstream

// src/lib/actions/teams.ts
'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { z } from 'zod';
import { app, db } from '../firebase/client';
import type { TeamMember } from '../types';
import { Timestamp, doc, updateDoc } from 'firebase/firestore';
import { errorEmitter } from '../firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '../firebase/errors';
=======
// functions/src/teams.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { z } from 'zod';
>>>>>>> Stashed changes

const db = admin.firestore();
const nowTs = () => admin.firestore.FieldValue.serverTimestamp();

// ---------- Helpers ----------
function assertAuth(ctx: any) {
  if (!ctx.auth?.uid) throw new HttpsError('unauthenticated', 'You must be logged in.');
  return ctx.auth.uid as string;
}

async function getMembership(teamId: string, uid: string) {
  const snap = await db
    .collection('teamMembers')
    .where('teamId', '==', teamId)
    .where('uid', '==', uid)
    .limit(1)
    .get();
  return snap.docs[0]?.data() as any | undefined;
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
      members: { // Add the members map on creation
        [uid]: 'owner'
      }
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

export const updateTeam = onCall({ region: 'europe-west1' }, async (req) => {
  const uid = assertAuth(req);
  const data = UpdateTeamSchema.parse(req.data ?? {});
  const member = await getMembership(data.teamId, uid);
  assertTeamAdmin(member);

  const update: any = { ...data };
  delete update.teamId;
  update.updatedAt = nowTs();

  await db.doc(`teams/${data.teamId}`).update(update);
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
  const members = await db.collection('teamMembers').where('teamId', '==', teamId).get();
  members.docs.forEach((d) => batch.delete(d.ref));
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

  // No patear al owner
  const ownerId = (await db.doc(`teams/${teamId}`).get()).get('ownerId');
  if (memberId === ownerId) throw new HttpsError('failed-precondition', 'Cannot remove the owner.');

  const snap = await db
    .collection('teamMembers')
    .where('teamId', '==', teamId)
    .where('uid', '==', memberId)
    .limit(1)
    .get();

  if (snap.empty) throw new HttpsError('not-found', 'Member not found.');
  await snap.docs[0].ref.delete();

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
      const mRef = db.collection('teamMembers').doc();
      tx.set(mRef, { teamId: inv.teamId, uid, role: 'member', joinedAt: nowTs() });
    }
  });

<<<<<<< Updated upstream
    const createTeamFunc = httpsCallable<CreateTeamData, ActionResponse>(functions, 'createTeam');
    const result = await createTeamFunc(validatedFields.data);
    
    return result.data;
  } catch (error: any) {
    if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: `teams`,
            operation: 'create',
            requestResourceData: values,
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    console.error('Error calling createTeam function:', error);
    return { success: false, message: error.message || 'Ocurrió un error inesperado.' };
  }
}
=======
  return { success: true, message: accept ? 'Invitación aceptada.' : 'Invitación rechazada.' };
});
>>>>>>> Stashed changes

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
      const mRef = db.collection('teamMembers').doc();
      tx.set(mRef, { teamId: app.teamId, uid: app.applicantId, role: 'member', joinedAt: nowTs() });
    }
  });

<<<<<<< Updated upstream
    const updateTeamFunc = httpsCallable<UpdateTeamData, ActionResponse>(functions, 'updateTeam');
    const result = await updateTeamFunc(validatedFields.data);
    
    return result.data;
  } catch (error: any) {
     if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: `teams/${values.teamId}`,
            operation: 'update',
            requestResourceData: values,
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    console.error('Error calling updateTeam function:', error);
    return { success: false, message: error.message || 'Ocurrió un error inesperado.' };
  }
}
=======
  return { success: true, message: accept ? 'Solicitud aceptada.' : 'Solicitud rechazada.' };
});
>>>>>>> Stashed changes

export const getTeamMembers = onCall({ region: 'europe-west1' }, async (req) => {
  const { teamId } = GetMembersSchema.parse(req.data ?? {});
  const q = await db.collection('teamMembers').where('teamId', '==', teamId).get();

  const members = await Promise.all(
    q.docs.map(async (d) => {
      const m = d.data() as any;
      const user = await db.doc(`users/${m.uid}`).get();
      const u = user.data() as any | undefined;
      return {
        id: d.id,
        uid: m.uid,
        role: m.role ?? 'member',
        joinedAt: (m.joinedAt?.toDate?.() ?? null)?.toISOString?.() ?? null,
        displayName: u?.name ?? u?.displayName ?? null,
        avatarUrl: u?.avatarUrl ?? u?.photoURL ?? null,
      };
    })
  );

<<<<<<< Updated upstream
        return result.data as ActionResponse;
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: `teams/${values.teamId}`,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        console.error('Error calling deleteTeam function:', error);
        return { success: false, message: error.message || 'Ocurrió un error inesperado.' };
    }
}

export async function kickTeamMember(teamId: string, memberId: string): Promise<ActionResponse> {
  try {
    const kickFunc = httpsCallable(functions, 'kickTeamMember');
    const result = await kickFunc({ teamId, memberId });
    return result.data as ActionResponse;
  } catch (error: any) {
    if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: `teamMembers/{teamMemberId}`,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    console.error('Error calling kickTeamMember function:', error);
    return { success: false, message: error.message || 'Ocurrió un error inesperado.' };
  }
}

export async function setTeamIGL(teamId: string, memberId: string | null): Promise<ActionResponse> {
  try {
    const setIglFunc = httpsCallable(functions, 'setTeamIGL');
    const result = await setIglFunc({ teamId, memberId });
    return result.data as ActionResponse;
  } catch (error: any) {
    if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: `teams/${teamId}`,
            operation: 'update',
            requestResourceData: { iglId: memberId },
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    console.error('Error calling setTeamIGL function:', error);
    return { success: false, message: error.message || 'Ocurrió un error inesperado.' };
  }
}

export async function sendTeamInvite(toUserId: string, teamId: string): Promise<ActionResponse> {
  try {
    const sendInviteFunc = httpsCallable(functions, 'sendTeamInvite');
    const result = await sendInviteFunc({ toUserId, teamId });
    return result.data as ActionResponse;
  } catch (error: any) {
    if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: `teamInvites`,
            operation: 'create',
            requestResourceData: { toUserId, teamId },
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    console.error('Error calling sendTeamInvite function:', error);
    return { success: false, message: error.message || 'Ocurrió un error inesperado.' };
  }
}

export async function respondToTeamInvite(inviteId: string, accept: boolean): Promise<ActionResponse> {
  try {
    const respondFunc = httpsCallable(functions, 'respondToTeamInvite');
    const result = await respondFunc({ inviteId, accept });
    return result.data as ActionResponse;
  } catch (error: any) {
     if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: `teamInvites/${inviteId}`,
            operation: 'update',
            requestResourceData: { status: accept ? 'accepted' : 'rejected' },
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    console.error('Error calling respondToTeamInvite function:', error);
    return { success: false, message: error.message || 'Ocurrió un error inesperado.' };
  }
}

export async function applyToTeam(teamId: string): Promise<ActionResponse> {
  try {
    const applyFunc = httpsCallable(functions, 'applyToTeam');
    const result = await applyFunc({ teamId });
    return result.data as ActionResponse;
  } catch (error: any) {
    if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: `teamApplications`,
            operation: 'create',
            requestResourceData: { teamId },
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    console.error('Error calling applyToTeam function:', error);
    return { success: false, message: error.message || 'Ocurrió un error inesperado.' };
  }
}

export async function respondToTeamApplication(values: { applicationId: string; accept: boolean }): Promise<ActionResponse> {
  try {
    const respondFunc = httpsCallable(functions, 'respondToTeamApplication');
    const result = await respondFunc(values);
    return result.data as ActionResponse;
  } catch (error: any) {
    if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: `teamApplications/${values.applicationId}`,
            operation: 'update',
            requestResourceData: { status: values.accept ? 'accepted' : 'rejected' },
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    console.error('Error calling respondToTeamApplication function:', error);
    return { success: false, message: error.message || 'Ocurrió un error inesperado.' };
  }
}
=======
  return members; // tu cliente rehidrata Timestamps
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
>>>>>>> Stashed changes

  const ref = db.doc(`teamTasks/${taskId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Task not found');
  if (snap.get('teamId') !== teamId) throw new HttpsError('permission-denied', 'Task does not belong to this team');

  await ref.delete();
  return { success: true, message: 'Task deleted' };
});

<<<<<<< Updated upstream
// New functions for team tasks
export async function addTask(teamId: string, title: string): Promise<ActionResponse> {
  try {
    const func = httpsCallable(functions, 'addTask');
    await func({ teamId, title });
    return { success: true, message: 'Task added' };
  } catch (error: any) {
    if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: `teams/${teamId}/tasks`,
            operation: 'create',
            requestResourceData: { title },
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    return { success: false, message: error.message };
  }
}

export async function updateTaskStatus(teamId: string, taskId: string, completed: boolean): Promise<ActionResponse> {
  try {
    const func = httpsCallable(functions, 'updateTaskStatus');
    await func({ teamId, taskId, completed });
    return { success: true, message: 'Task updated' };
  } catch (error: any) {
    if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: `teams/${teamId}/tasks/${taskId}`,
            operation: 'update',
            requestResourceData: { completed },
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    return { success: false, message: error.message };
  }
}

export async function deleteTask(teamId: string, taskId: string): Promise<ActionResponse> {
  try {
    const func = httpsCallable(functions, 'deleteTask');
    await func({ teamId, taskId });
    return { success: true, message: 'Task deleted' };
  } catch (error: any) {
    if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: `teams/${teamId}/tasks/${taskId}`,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    return { success: false, message: error.message };
  }
}

export async function updateMemberSkills(teamId: string, memberId: string, skills: string[]): Promise<ActionResponse> {
  const userDocRef = doc(db, 'users', memberId);
  const payload = { skills };
  
  try {
    await updateDoc(userDocRef, payload);
    return { success: true, message: 'Skills updated.' };
  } catch (serverError: any) {
    if (serverError.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'update',
            requestResourceData: payload,
        } satisfies SecurityRuleContext);
        
        errorEmitter.emit('permission-error', permissionError);
    }
    
    console.error('Error updating member skills:', serverError);
    return { success: false, message: serverError.message || 'An unexpected error occurred.' };
  }
}
=======
export const updateMemberSkills = onCall({ region: 'europe-west1' }, async (req) => {
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
  if (snap.empty) throw new HttpsError('not-found', 'Member not found');

  await snap.docs[0].ref.update({ skills, updatedAt: nowTs() });
  return { success: true, message: 'Skills updated.' };
});
>>>>>>> Stashed changes
