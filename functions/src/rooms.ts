
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface CreateRoomData {
  name: string;
  game: string;
  server: string;
  rank: string;
  partySize: string;
}

export const createGameRoomWithDiscord = onCall(async ({ auth, data }: { auth?: any, data: CreateRoomData }) => {
  const uid = auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "You must be logged in to create a room.");
  }

  const { name, game, server, rank, partySize } = data;
  if (!name || !game || !server || !rank || !partySize) {
    throw new HttpsError("invalid-argument", "Missing required room details.");
  }
  
  const roomRef = db.collection("gameRooms").doc();

  try {
    await roomRef.set({
      id: roomRef.id,
      name,
      game,
      server,
      rank,
      partySize,
      createdBy: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      discordChannelId: null, // Discord integration is not implemented
    });

    return { success: true, message: "Room created successfully.", roomId: roomRef.id, discordChannelId: null };
  } catch (error) {
    console.error("Error creating game room in Firestore:", error);
    throw new HttpsError("internal", "Failed to create the game room.");
  }
});
