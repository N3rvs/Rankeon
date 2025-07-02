'use server';

import { z } from 'zod';
import { getAdminInstances } from '@/lib/firebase/admin';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';
import { Client, GatewayIntentBits, ChannelType } from 'discord.js';

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

async function createDiscordChannel(roomName: string): Promise<string> {
    const token = process.env.DISCORD_BOT_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;
    
    if (!token || !guildId) {
        throw new Error('Las credenciales del bot de Discord (token y ID del servidor) no están configuradas en el entorno.');
    }

    const client = new Client({ intents: [GatewayIntentBits.Guilds] });

    try {
        await client.login(token);

        const guild = await client.guilds.fetch(guildId);
        if (!guild) {
            throw new Error(`No se pudo encontrar el servidor con ID: ${guildId}`);
        }

        const channel = await guild.channels.create({
            name: `Sala: ${roomName}`,
            type: ChannelType.GuildVoice,
            // Puedes añadirlo a una categoría si quieres descomentando la siguiente línea
            // parent: 'YOUR_CATEGORY_ID',
        });
        
        return channel.id;
    } finally {
        // Asegúrate de que el cliente de Discord se desconecte siempre
        if (client.readyAt) {
            await client.destroy();
        }
    }
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
