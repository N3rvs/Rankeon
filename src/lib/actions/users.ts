'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase/client';
import type { UserProfile, UserRole, UserStatus } from '../types';
import { Timestamp } from 'firebase/firestore';

const functions = getFunctions(app, "europe-west1");

type ActionResponse = {
  success: boolean;
  message: string;
};

// --- Funciones updateUserRole, updateUserStatus, updateUserCertification (Sin cambios necesarios) ---
export async function updateUserRole({
  uid,
  role,
}: {
  uid: string;
  role: UserRole;
}): Promise<ActionResponse> {
  try {
    const updateUserRoleFunc = httpsCallable<{uid: string; role: UserRole}, ActionResponse>(functions, 'updateUserRole');
    const result = await updateUserRoleFunc({ uid, role });
    return result.data;
  } catch (error: any) {
    console.error('Error al actualizar el rol del usuario:', error);
    return { success: false, message: error.message || 'Ocurrió un error inesperado.' };
  }
}

export async function updateUserStatus({
  uid,
  disabled,
  duration, // en horas
}: {
  uid: string;
  disabled: boolean;
  duration?: number;
}): Promise<ActionResponse> {
  try {
    const updateUserStatusFunc = httpsCallable<{uid: string; disabled: boolean; duration?: number}, ActionResponse>(functions, 'updateUserStatus');
    const result = await updateUserStatusFunc({ uid, disabled, duration });
    return result.data;
  } catch (error: any) {
    console.error('Error al actualizar el estado del usuario:', error);
    return { success: false, message: error.message || 'Ocurrió un error inesperado.' };
  }
}

export async function updateUserCertification({
  uid,
  isCertified,
}: {
  uid: string;
  isCertified: boolean;
}): Promise<ActionResponse> {
  try {
    const updateUserCertificationFunc = httpsCallable<{uid: string; isCertified: boolean}, ActionResponse>(functions, 'updateUserCertification');
    const result = await updateUserCertificationFunc({ uid, isCertified });
    return result.data;
  } catch (error: any) {
    console.error('Error al actualizar la certificación del usuario:', error);
    return { success: false, message: error.message || 'Ocurrió un error inesperado.' };
  }
}



export async function updateUserPresence(status: UserStatus): Promise<ActionResponse> {
  try {
    // ESTA FUNCIÓN NO EXISTE EN EL BACKEND PROPORCIONADO
    const updateUserPresenceFunc = httpsCallable(functions, 'updateUserPresence');
    const result = await updateUserPresenceFunc({ status });
    return (result.data as ActionResponse);
  } catch (error: any) {
    console.error('Error updating user presence:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}


// *** FALLITO #2 CORREGIDO: getManagedUsers ahora usa paginación ***
/**
 * Obtiene usuarios gestionados de forma paginada.
 * @param lastId El ID del último usuario obtenido en el lote anterior, o null para la primera página.
 * @returns Un objeto que contiene los usuarios de la página y el ID para la siguiente página.
 */
export async function getManagedUsers(lastId: string | null): Promise<{
    success: boolean;
    data?: { users: UserProfile[]; nextLastId: string | null };
    message: string;
}> {
    try {
        // Llama a la función paginada del backend (asegúrate que se llame así en public.ts)
        const getManagedUsersFunc = httpsCallable<{ lastId: string | null }, { users: any[]; nextLastId: string | null }>(functions, 'getManagedUsers');
        const result = await getManagedUsersFunc({ lastId });

        // Convierte Timestamps ISO strings a objetos Timestamp
        const users = result.data.users.map(u => ({
            ...u,
            createdAt: u.createdAt ? Timestamp.fromDate(new Date(u.createdAt)) : undefined,
            banUntil: u.banUntil ? Timestamp.fromDate(new Date(u.banUntil)) : undefined,
            // Mantén _claimsRefreshedAt si lo necesitas para refrescar tokens
            _claimsRefreshedAt: u._claimsRefreshedAt ? Timestamp.fromDate(new Date(u._claimsRefreshedAt)) : undefined,
        }));

        return {
            success: true,
            data: {
                users: users as UserProfile[],
                nextLastId: result.data.nextLastId, // Devuelve el ID para la siguiente página
            },
            message: 'Usuarios obtenidos.',
        };
    } catch (error: any) {
        console.error('Error al obtener usuarios gestionados:', error);
        return { success: false, message: error.message || 'Ocurrió un error inesperado.' };
    }
}