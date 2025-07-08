// functions/src/public.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

// A helper to calculate total honors for a user document data
const calculateTotalHonors = (userData: admin.firestore.DocumentData): number => {
    if (!userData.honorCounts) return 0;
    return Object.values(userData.honorCounts).reduce((sum: number, count: any) => sum + count, 0);
};

export const getMarketPlayers = onCall(async ({ auth }) => {
    if (!auth) {
        throw new HttpsError('unauthenticated', 'Authentication is required.');
    }
    const usersSnapshot = await db.collection('users').get();
    const players = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        // Return only public-safe fields
        return {
            id: doc.id,
            name: data.name || '',
            avatarUrl: data.avatarUrl || '',
            primaryGame: data.primaryGame || '',
            skills: data.skills || [],
            rank: data.rank || '',
            country: data.country || '',
            lookingForTeam: data.lookingForTeam || false,
            teamId: data.teamId || null,
            blocked: data.blocked || [], // Keep blocked to allow client-side filtering
        };
    });
    return players;
});

export const getMarketTeams = onCall(async ({ auth }) => {
     if (!auth) {
        throw new HttpsError('unauthenticated', 'Authentication is required.');
    }
    const teamsSnapshot = await db.collection('teams').get();
    // Return timestamp fields as ISO strings
    return teamsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate().toISOString(),
        };
    });
});

export const getHonorRankings = onCall(async () => {
    const usersSnapshot = await db.collection('users').get();
    return usersSnapshot.docs
        .map(doc => {
            const user = doc.data();
            return {
                id: doc.id,
                name: user.name,
                avatarUrl: user.avatarUrl,
                totalHonors: calculateTotalHonors(user),
            };
        })
        .filter(user => user.totalHonors > 0)
        .sort((a, b) => b.totalHonors - a.totalHonors)
        .slice(0, 50);
});

export const getScrimRankings = onCall(async () => {
    const teamsSnapshot = await db.collection('teams').where('stats.scrimsPlayed', '>', 0).get();
    return teamsSnapshot.docs
        .map(doc => {
            const teamData = doc.data();
            const played = teamData.stats?.scrimsPlayed || 0;
            const won = teamData.stats?.scrimsWon || 0;
            const winRate = played > 0 ? (won / played) * 100 : 0;
            return {
                id: doc.id,
                ...teamData,
                winRate,
                played,
                createdAt: teamData.createdAt?.toDate().toISOString(),
            };
        })
        .sort((a, b) => b.winRate - a.winRate || (b.stats?.scrimsWon || 0) - (a.stats?.scrimsWon || 0))
        .slice(0, 50);
});

export const getTournamentRankings = onCall(async () => {
    const tourneySnapshot = await db.collection('tournaments')
        .where('status', '==', 'completed')
        .where('winnerId', '!=', null)
        .orderBy('winnerId')
        .orderBy('startDate', 'desc')
        .get();
        
    return tourneySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: doc.id,
            startDate: data.startDate?.toDate().toISOString(),
            createdAt: data.createdAt?.toDate().toISOString(),
        };
    });
});
