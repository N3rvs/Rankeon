// src/lib/actions/teams.ts
'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { z } from 'zod';
import { app, db } from '../firebase/client';
import type { TeamMember } from '../types';
import { Timestamp, doc, updateDoc } from 'firebase/firestore';
import { errorEmitter } from '../firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '../firebase/errors';

const functions = getFunctions(app, "europe-west1");

// Schema for creating a team
export const CreateTeamSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.').max(50),
  game: z.string().min(1, 'El juego es obligatorio.').default('Valorant'),
  description: z.string().max(500, 'La descripción es muy larga.').optional(),
});
export type CreateTeamData = z.infer<typeof CreateTeamSchema>;

// Schema for updating a team
export const UpdateTeamSchema = z.object({
    teamId: z.string().min(1),
    name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.').max(50),
    description: z.string().max(500, 'La descripción es muy larga.').optional(),
    lookingForPlayers: z.boolean(),
    recruitingRoles: z.array(z.string()).optional(),
    videoUrl: z.string().url("Debe ser una URL válida.").or(z.literal("")).optional(),
    avatarUrl: z.string().url().optional(),
    bannerUrl: z.string().url().optional(),
    discordUrl: z.string().url("Debe ser una URL válida.").or(z.literal("")).optional(),
    twitchUrl: z.string().url("Debe ser una URL válida.").or(z.literal("")).optional(),
    twitterUrl: z.string().url("Debe ser una URL válida.").or(z.literal("")).optional(),
    rankMin: z.string().optional(),
    rankMax: z.string().optional(),
}).refine((data) => {
    if (data.rankMin && !data.rankMax) {
        data.rankMax = data.rankMin;
    }
    if (!data.rankMin && data.rankMax) {
        data.rankMin = data.rankMax;
    }
    return true;
}).refine((data) => {
    if (data.rankMin && data.rankMax) {
        const rankOrder: { [key: string]: number } = {
            'Hierro': 1,
            'Bronce': 2,
            'Plata': 3,
            'Oro': 4,
            'Platino': 5,
            'Ascendente': 6,
            'Inmortal': 7,
        };
        return rankOrder[data.rankMin as keyof typeof rankOrder] <= rankOrder[data.rankMax as keyof typeof rankOrder];
    }
    return true;
}, {
    message: "El rango mínimo no puede ser superior al máximo.",
    path: ["rankMin"],
});
export type UpdateTeamData = z.infer<typeof UpdateTeamSchema>;

// Schema for deleting a team
const DeleteTeamSchema = z.object({
  teamId: z.string().min(1, "Se requiere el ID del equipo."),
});

type ActionResponse = {
  success: boolean;
  message: string;
  teamId?: string;
};

export async function createTeam(values: CreateTeamData): Promise<ActionResponse> {
  try {
    const validatedFields = CreateTeamSchema.safeParse(values);
    if (!validatedFields.success) {
      const firstError = validatedFields.error.errors[0]?.message || 'Datos del formulario no válidos.';
      return { success: false, message: firstError };
    }

    const createTeamFunc = httpsCallable<CreateTeamData, ActionResponse>(functions, 'createTeam');
    const result = await createTeamFunc(validatedFields.data);
    
    return result.data;
  } catch (error: any) {
    console.error('Error calling createTeam function:', error);
    return { success: false, message: error.message || 'Ocurrió un error inesperado.' };
  }
}

export async function updateTeam(values: UpdateTeamData): Promise<ActionResponse> {
  try {
    const validatedFields = UpdateTeamSchema.safeParse(values);
    if (!validatedFields.success) {
      const firstError = validatedFields.error.errors[0]?.message || 'Datos de actualización no válidos.';
      return { success: false, message: firstError };
    }

    const updateTeamFunc = httpsCallable<UpdateTeamData, ActionResponse>(functions, 'updateTeam');
    const result = await updateTeamFunc(validatedFields.data);
    
    return result.data;
  } catch (error: any) {
    console.error('Error calling updateTeam function:', error);
    return { success: false, message: error.message || 'Ocurrió un error inesperado.' };
  }
}

export async function deleteTeam(values: { teamId: string }): Promise<ActionResponse> {
    try {
        const validatedFields = DeleteTeamSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: 'ID de equipo no válido.' };
        }

        const deleteTeamFunc = httpsCallable(functions, 'deleteTeam');
        const result = await deleteTeamFunc(validatedFields.data);

        return result.data as ActionResponse;
    } catch (error: any) {
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
    console.error('Error calling respondToTeamApplication function:', error);
    return { success: false, message: error.message || 'Ocurrió un error inesperado.' };
  }
}

export async function getTeamMembers(teamId: string): Promise<{ success: boolean; data?: TeamMember[]; message: string; }> {
  try {
    const getMembersFunc = httpsCallable<{ teamId: string }, any[]>(functions, 'getTeamMembers');
    const result = await getMembersFunc({ teamId });
    
    // Re-hydrate timestamps
    const members = (result.data || []).map(m => ({
        ...m,
        joinedAt: m.joinedAt ? Timestamp.fromDate(new Date(m.joinedAt)) : undefined,
    }));
    
    return { success: true, data: members as TeamMember[], message: 'Members fetched.' };
  } catch (error: any) {
    console.error('Error getting team members:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred.',
    };
  }
}


// New functions for team tasks
export async function addTask(teamId: string, title: string): Promise<ActionResponse> {
  try {
    const func = httpsCallable(functions, 'addTask');
    await func({ teamId, title });
    return { success: true, message: 'Task added' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function updateTaskStatus(teamId: string, taskId: string, completed: boolean): Promise<ActionResponse> {
  try {
    const func = httpsCallable(functions, 'updateTaskStatus');
    await func({ teamId, taskId, completed });
    return { success: true, message: 'Task updated' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function deleteTask(teamId: string, taskId: string): Promise<ActionResponse> {
  try {
    const func = httpsCallable(functions, 'deleteTask');
    await func({ teamId, taskId });
    return { success: true, message: 'Task deleted' };
  } catch (error: any) {
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
