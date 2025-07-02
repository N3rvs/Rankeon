import * as admin from 'firebase-admin';
import {onCall, HttpsError} from 'firebase-functions/v2/https';
import {onSchedule} from 'firebase-functions/v2/scheduler';
import {
  Client,
  GatewayIntentBits,
  ChannelType,
  GuildVoiceChannel,
} from 'discord.js';

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

interface CreateGameRoomData {
  name: string;
  game: string;
  server: string;
  rank: string;
  partySize: string;
}

/**
 * Creates a game room document in Firestore and a corresponding voice channel in Discord.
 */
export const createGameRoomWithDiscord = onCall<CreateGameRoomData>(
  {
    region: 'europe-west1',
    secrets: ['DISCORD_BOT_TOKEN', 'DISCORD_GUILD_ID'],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'You must be logged in to create a room.'
      );
    }

    const {uid} = request.auth;
    const {name, game, server, rank, partySize} = request.data;

    // Validate input
    if (!name || !game || !server || !rank || !partySize) {
      throw new HttpsError('invalid-argument', 'Missing required room details.');
    }

    const roomRef = db.collection('gameRooms').doc();

    // Create Discord Channel
    const token = process.env.DISCORD_BOT_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;

    if (!token || !guildId) {
      console.error('Discord environment variables are not set.');
      throw new HttpsError(
        'internal',
        'Server configuration error for Discord integration.'
      );
    }

    const client = new Client({
      intents: [GatewayIntentBits.Guilds],
    });

    let channelId: string | null = null;

    try {
      await client.login(token);
      const guild = await client.guilds.fetch(guildId);

      const channel = await guild.channels.create({
        name: `Sala: ${name.substring(0, 90)}`, // Discord channel names have a 100-char limit
        type: ChannelType.GuildVoice,
      });

      channelId = channel.id;
    } catch (err) {
      console.error('Error creating Discord channel:', err);
      // We will still create the room in Firestore, but without a channel ID.
      // The error is logged for the admin to investigate.
    } finally {
      client.destroy();
    }

    // Create Firestore Document
    const roomData = {
      id: roomRef.id,
      name,
      game,
      server,
      rank,
      partySize,
      createdBy: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      discordChannelId: channelId,
    };

    await roomRef.set(roomData);

    return {
      success: true,
      roomId: roomRef.id,
      discordChannelId: channelId,
    };
  }
);

/**
 * Scheduled function to clean up empty Discord voice channels and their corresponding Firestore documents.
 * It runs every 5 minutes.
 */
export const cleanupVoiceRooms = onSchedule(
  {
    schedule: 'every 5 minutes',
    region: 'europe-west1',
    secrets: ['DISCORD_BOT_TOKEN', 'DISCORD_GUILD_ID'],
  },
  async () => {
    const token = process.env.DISCORD_BOT_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;

    if (!token || !guildId) {
      console.error('Discord environment variables not set for cleanup job.');
      return;
    }

    const client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
    });

    try {
      await client.login(token);
      const guild = await client.guilds.fetch(guildId);

      // Find all game rooms that have a discordChannelId
      const roomsQuery = db
        .collection('gameRooms')
        .where('discordChannelId', '!=', null);
      const roomsSnapshot = await roomsQuery.get();

      if (roomsSnapshot.empty) {
        console.log('Cleanup: No rooms with Discord channels found.');
        return;
      }

      for (const doc of roomsSnapshot.docs) {
        const room = doc.data();
        const channelId = room.discordChannelId;

        try {
          const channel = await guild.channels.fetch(channelId);

          // If channel doesn't exist on Discord, just delete the Firestore doc
          if (!channel) {
            console.log(
              `Cleanup: Channel ${channelId} not found on Discord. Deleting room ${doc.id}.`
            );
            await doc.ref.delete();
            continue;
          }

          // Ensure it's a voice channel
          if (channel.type !== ChannelType.GuildVoice) continue;

          // If the voice channel is empty, delete it and the Firestore document
          const voiceChannel = channel as GuildVoiceChannel;
          if (voiceChannel.members.size === 0) {
            await voiceChannel.delete('Automatic cleanup: Empty room.');
            await doc.ref.delete();
            console.log(
              `Cleanup: Deleted empty room and channel ${doc.id} (${channelId})`
            );
          }
        } catch (err: any) {
          // If error is "Unknown Channel", it was likely deleted manually.
          if (err.code === 10003) {
            // Discord API error code for Unknown Channel
            console.log(
              `Cleanup: Channel ${channelId} for room ${doc.id} already deleted. Deleting Firestore doc.`
            );
            await doc.ref.delete();
          } else {
            console.warn(
              `Cleanup: Could not verify/delete channel ${channelId} for room ${doc.id}.`,
              err
            );
          }
        }
      }
    } catch (err) {
      console.error('Error during cleanupVoiceRooms execution:', err);
    } finally {
      client.destroy();
    }
  }
);
