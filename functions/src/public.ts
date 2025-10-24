// functions/src/public.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

// A helper to calculate total honors for a user document data
const calculateTotalHonors = (userData: admin.firestore.DocumentData): number => {
    if (!userData.honorCounts) return 0;
    return Object.values(userData.honorCounts).reduce((sum: number, count: any) => sum + count, 0);
};

export const getFeaturedScrims = onCall({ allowInvalidAppCheck: true }, async () => {
    try {
        const scrimsSnapshot = await db.collection('scrims')
            .where('status', '==', 'confirmed')
            .orderBy('date', 'desc')
            .limit(10)
            .get();

        const confirmedScrims = scrimsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                // Convert Timestamps to ISO strings for serialization
                date: data.date?.toDate().toISOString(),
                createdAt: data.createdAt?.toDate().toISOString(),
            };
        });
        
        return confirmedScrims;
    } catch (error) {
        console.error("Error fetching featured scrims:", error);
        throw new HttpsError("internal", "Failed to retrieve featured scrims.");
    }
});


export const getMarketPlayers = onCall(async ({ auth }) => {
    if (!auth) {
        throw new HttpsError('unauthenticated', 'Authentication is required.');
    }
    const usersSnapshot = await db.collection('users').get();
    const players = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        // Return only public-safe, serializable fields
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

export const getHonorRankings = onCall(async ({ auth }) => {
    if (!auth) {
        throw new HttpsError('unauthenticated', 'Authentication is required.');
    }
    const usersSnapshot = await db.collection('users').get();
    return usersSnapshot.docs
        .map(doc => {
            const user = doc.data();
            return {
                id: doc.id,
                name: user.name,
                avatarUrl: user.avatarUrl,
                totalHonors: calculateTotalHonors(user),
                isCertifiedStreamer: user.isCertifiedStreamer || false,
            };
        })
        .filter(user => user.totalHonors > 0)
        .sort((a, b) => b.totalHonors - a.totalHonors)
        .slice(0, 50);
});

export const getScrimRankings = onCall(async ({ auth }) => {
    if (!auth) {
        throw new HttpsError('unauthenticated', 'Authentication is required.');
    }
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
                won,
                createdAt: teamData.createdAt?.toDate().toISOString(),
            };
        })
        .sort((a, b) => b.winRate - (a.winRate || 0) || (b.won || 0) - (a.won || 0))
        .slice(0, 50);
});

export const getTournamentRankings = onCall(async ({ auth }) => {
    if (!auth) {
        throw new HttpsError('unauthenticated', 'Authentication is required.');
    }
    const tourneySnapshot = await db.collection('tournaments')
        .where('status', '==', 'completed')
        .get();
        
    const tournaments = tourneySnapshot.docs
        .filter(doc => !!doc.data().winnerId)
        .map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                startDate: data.startDate?.toDate(),
                createdAt: data.createdAt?.toDate(),
            };
        })
        .sort((a, b) => (b.startDate?.getTime() || 0) - (a.startDate?.getTime() || 0))
        .map(t => ({
            ...t,
            startDate: t.startDate?.toISOString(),
            createdAt: t.createdAt?.toISOString(),
        }));
    
    return tournaments;
});

export const getManagedUsers = onCall(async ({ auth: callerAuth }) => {
    if (!callerAuth) throw new HttpsError('unauthenticated', 'You must be logged in.');
    const { role } = callerAuth.token;
    if (role !== 'admin' && role !== 'moderator') {
        throw new HttpsError('permission-denied', 'You do not have permission to access user data.');
    }
    
    const usersSnapshot = await db.collection('users').get();
    return usersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate().toISOString() || null,
            banUntil: data.banUntil?.toDate().toISOString() || null,
            _claimsRefreshedAt: data._claimsRefreshedAt?.toDate().toISOString() || null,
        }
    });
});

export const getTeamMembers = onCall(async (request) => {
    const { teamId } = request.data;
    if (!teamId) throw new HttpsError('invalid-argument', 'Team ID is required.');
    // In a real app, you'd add a permission check here.
    // For now, we allow any authenticated user to fetch members for simplicity.
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication is required.');

    const membersSnap = await db.collection(`teams/${teamId}/members`).get();
    const memberIds = membersSnap.docs.map(doc => doc.id);

    if (memberIds.length === 0) {
        return [];
    }

    const usersSnap = await db.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', memberIds).get();
    const usersMap = new Map(usersSnap.docs.map(doc => [doc.id, doc.data()]));
    
    return membersSnap.docs.map(doc => {
        const memberData = doc.data();
        const userData = usersMap.get(doc.id) || {};
        return {
            ...memberData,
            ...userData,
            id: doc.id,
            joinedAt: memberData.joinedAt?.toDate().toISOString(),
        }
    });
});
