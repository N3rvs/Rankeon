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

    let channelId: string | null = null;
    
    try {
      const discordApiUrl = `https://discord.com/api/v10/guilds/${guildId}/channels`;
      const channelName = `Sala: ${name.substring(0, 90)}`; // Discord channel names have a 100-char limit

      const response = await fetch(discordApiUrl, {
          method: 'POST',
          headers: {
              'Authorization': `Bot ${token}`,
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({
              name: channelName,
              type: 2, // 2 is for GUILD_VOICE channel type
          }),
      });

      if (response.ok) {
          const channelData = await response.json();
          channelId = channelData.id;
      } else {
          const errorBody = await response.json();
          console.error('Error creating Discord channel. Status:', response.status, 'Body:', JSON.stringify(errorBody, null, 2));
          // Do not throw an error, just proceed without a channel.
      }
    } catch (err) {
      console.error('Exception when trying to create Discord channel:', err);
      // We will still create the room in Firestore, but without a channel ID.
      // The error is logged for the admin to investigate.
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


// --- FRIEND MANAGEMENT FUNCTIONS ---

export const sendFriendRequest = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in.');
    const { uid } = request.auth;
    const { to } = request.data;
    if (!to || uid === to) throw new HttpsError('invalid-argument', 'Invalid recipient ID.');

    const batch = db.batch();
    const fromUserRef = db.collection('users').doc(uid);
    const toUserRef = db.collection('users').doc(to);

    const [fromUserSnap, toUserSnap] = await Promise.all([fromUserRef.get(), toUserRef.get()]);
    if (!fromUserSnap.exists() || !toUserSnap.exists()) {
        throw new HttpsError('not-found', 'One or both users not found.');
    }

    const existingRequestQuery = db.collection('friendRequests')
        .where('from', 'in', [uid, to])
        .where('to', 'in', [uid, to])
        .where('status', '==', 'pending');
    
    const existingRequestSnap = await existingRequestQuery.get();
    if (!existingRequestSnap.empty) {
        throw new HttpsError('already-exists', 'A pending friend request already exists.');
    }

    const requestRef = db.collection('friendRequests').doc();
    batch.set(requestRef, { from: uid, to, status: 'pending', createdAt: admin.firestore.FieldValue.serverTimestamp() });

    const notificationRef = db.collection('inbox').doc(to).collection('notifications').doc();
    batch.set(notificationRef, {
        type: 'friend_request',
        from: uid,
        read: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        extraData: { requestId: requestRef.id }
    });

    await batch.commit();
    return { success: true, message: 'Friend request sent.' };
});

export const respondToFriendRequest = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in.');
    const { uid } = request.auth;
    const { requestId, accept } = request.data;
    if (!requestId || typeof accept !== 'boolean') throw new HttpsError('invalid-argument', 'Missing parameters.');

    const requestRef = db.collection('friendRequests').doc(requestId);
    const requestSnap = await requestRef.get();
    if (!requestSnap.exists() || requestSnap.data()?.to !== uid) {
        throw new HttpsError('not-found', 'Friend request not found or you are not the recipient.');
    }
    if (requestSnap.data()?.status !== 'pending') {
        throw new HttpsError('failed-precondition', 'Request has already been resolved.');
    }

    const fromId = requestSnap.data()?.from;
    const batch = db.batch();
    batch.update(requestRef, { status: accept ? 'accepted' : 'rejected' });

    if (accept) {
        const fromUserRef = db.collection('users').doc(fromId);
        const toUserRef = db.collection('users').doc(uid);
        batch.update(fromUserRef, { friends: admin.firestore.FieldValue.arrayUnion(uid) });
        batch.update(toUserRef, { friends: admin.firestore.FieldValue.arrayUnion(fromId) });

        const notificationRef = db.collection('inbox').doc(fromId).collection('notifications').doc();
        batch.set(notificationRef, {
            type: 'friend_accepted',
            from: uid,
            read: false,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    await batch.commit();
    return { success: true, message: `Request ${accept ? 'accepted' : 'rejected'}.` };
});


export const removeFriend = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in.');
    const { uid } = request.auth;
    const { friendUid } = request.data;
    if (!friendUid) throw new HttpsError('invalid-argument', 'Friend ID is required.');

    const batch = db.batch();
    const currentUserRef = db.collection('users').doc(uid);
    const friendUserRef = db.collection('users').doc(friendUid);

    batch.update(currentUserRef, { friends: admin.firestore.FieldValue.arrayRemove(friendUid) });
    batch.update(friendUserRef, { friends: admin.firestore.FieldValue.arrayRemove(uid) });
    
    const notificationRef = db.collection('inbox').doc(friendUid).collection('notifications').doc();
    batch.set(notificationRef, {
        type: 'friend_removed',
        from: uid,
        read: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();
    return { success: true, message: 'Friend removed.' };
});

export const blockUser = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in.');
    const { uid } = request.auth;
    const { blockedUid } = request.data;
    if (!blockedUid || uid === blockedUid) throw new HttpsError('invalid-argument', 'Invalid user to block.');

    const currentUserRef = db.collection('users').doc(uid);

    await db.runTransaction(async (transaction) => {
        transaction.update(currentUserRef, { 
            blocked: admin.firestore.FieldValue.arrayUnion(blockedUid),
            friends: admin.firestore.FieldValue.arrayRemove(blockedUid)
        });
        const otherUserRef = db.collection('users').doc(blockedUid);
        transaction.update(otherUserRef, {
            friends: admin.firestore.FieldValue.arrayRemove(uid)
        });
    });

    return { success: true, message: 'User has been blocked.' };
});


// --- MESSAGING FUNCTIONS ---

export const sendMessageToFriend = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in.');
    const { uid } = request.auth;
    const { to, content } = request.data;
    if (!to || !content) throw new HttpsError('invalid-argument', 'Missing recipient or content.');

    const fromUserRef = db.collection('users').doc(uid);
    const fromUserSnap = await fromUserRef.get();
    const fromUserData = fromUserSnap.data();

    if (!fromUserData?.friends?.includes(to)) {
        throw new HttpsError('failed-precondition', 'You must be friends to send a message.');
    }

    const members = [uid, to].sort();
    const chatId = members.join('_');
    const chatRef = db.collection('chats').doc(chatId);
    const messageRef = chatRef.collection('messages').doc();

    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    const lastMessage = { content, sender: uid, createdAt: timestamp };

    const batch = db.batch();
    batch.set(chatRef, { members, createdAt: timestamp, lastMessageAt: timestamp, lastMessage }, { merge: true });
    batch.set(messageRef, { sender: uid, content, createdAt: timestamp });
    
    // Notification for recipient
    const notificationRef = db.collection('inbox').doc(to).collection('notifications').doc();
    batch.set(notificationRef, {
        type: 'new_message',
        from: uid,
        read: false,
        timestamp: timestamp,
        content: content.length > 50 ? content.substring(0, 47) + '...' : content,
        extraData: { chatId }
    });
    
    await batch.commit();

    return { success: true, message: 'Message sent.' };
});

export const deleteMessage = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in.');
    const { uid } = request.auth;
    const { chatId, messageId } = request.data;
    if (!chatId || !messageId) throw new HttpsError('invalid-argument', 'Missing chat or message ID.');

    const messageRef = db.collection('chats').doc(chatId).collection('messages').doc(messageId);
    const messageSnap = await messageRef.get();

    if (!messageSnap.exists() || messageSnap.data()?.sender !== uid) {
        throw new HttpsError('permission-denied', 'You do not have permission to delete this message.');
    }

    await messageRef.delete();
    return { success: true, message: 'Message deleted.' };
});

// --- NOTIFICATION FUNCTIONS ---

export const deleteInboxNotification = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in.');
    const { uid } = request.auth;
    const { notificationId } = request.data;

    if (!notificationId) {
        throw new HttpsError('invalid-argument', 'Notification ID is required.');
    }

    const notificationRef = db.collection('inbox').doc(uid).collection('notifications').doc(notificationId);
    await notificationRef.delete();

    return { success: true, message: 'Notification deleted.' };
});
