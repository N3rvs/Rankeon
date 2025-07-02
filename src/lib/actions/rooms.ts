'use server';

import { z } from 'zod';
import { getAdminInstances } from '@/lib/firebase/admin';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';

const CreateRoomSchema = z.object({
  name: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres.' }).max(50),
  game: z.string().min(1, { message: 'Por favor, introduce un juego.' }),
  server: z.string().min(1, { message: 'Por favor, selecciona un servidor.' }),
  rank: z.string().min(1, { message: 'Por favor, selecciona un rango.' }),
  partySize: z.string().min(1, { message: 'Por favor, selecciona un tamaño de grupo.' }),
});

type ActionResponse = {
  success: boolean;
  message: string;
  roomId?: string;
  discordChannelId?: string;
};

// Uses the Discord REST API directly to avoid pulling heavy dependencies into the build.
async function createDiscordChannel(roomName: string): Promise<string> {
    const token = process.env.DISCORD_BOT_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;
    
    if (!token || !guildId) {
        throw new Error('Las credenciales del bot de Discord (token y ID del servidor) no están configuradas en el entorno.');
    }

    const url = `https://discord.com/api/v10/guilds/${guildId}/channels`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bot ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: `Sala: ${roomName}`,
            type: 2, // GuildVoice channel type
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Error creating Discord channel:', errorData);
        throw new Error(`Error al crear canal de Discord: ${errorData.message || response.statusText}`);
    }

    const channel = await response.json();
    return channel.id;
}


export async function createRoom(
  values: z.infer<typeof CreateRoomSchema>,
  token: string | null
): Promise<ActionResponse> {
  if (!token) {
    return { success: false, message: 'Falta el token de autenticación.' };
  }

  const { adminAuth, adminDb } = getAdminInstances();
  let newRoomRef: FirebaseFirestore.DocumentReference | null = null;
  
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;
    
    const validatedFields = CreateRoomSchema.safeParse(values);

    if (!validatedFields.success) {
      return { success: false, message: 'Datos del formulario no válidos.' };
    }
    
    const { name, game, server, rank, partySize } = validatedFields.data;
    
    newRoomRef = adminDb.collection('gameRooms').doc();
    
    await newRoomRef.set({
      id: newRoomRef.id,
      name,
      game,
      server,
      rank,
      partySize,
      createdBy: uid,
      discordChannelId: null, // Se establece como nulo inicialmente
      createdAt: FieldValue.serverTimestamp(),
    });

    // Crear el canal de Discord
    const channelId = await createDiscordChannel(name);

    // Actualizar el documento de la sala con el ID del canal de Discord
    await newRoomRef.update({
        discordChannelId: channelId,
    });

    revalidatePath('/rooms');

    return { success: true, message: 'Sala y canal de Discord creados con éxito.', roomId: newRoomRef.id, discordChannelId: channelId };
  } catch (error: any) {
    console.error('Error al crear la sala:', error);
    // Si la sala se creó pero Discord falló, la eliminamos para evitar inconsistencias
    if (newRoomRef) {
        await newRoomRef.delete().catch(delErr => console.error("Error al limpiar la sala fallida:", delErr));
    }
    if (error.code === 'auth/id-token-expired') {
        return { success: false, message: 'La sesión ha expirado. Por favor, inicia sesión de nuevo.' };
    }
    return { success: false, message: error.message || 'No se pudo crear la sala. Por favor, inténtalo de nuevo.' };
  }
}
