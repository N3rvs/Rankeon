// src/contexts/auth-context.tsx
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { onIdTokenChanged, User as FirebaseUser } from 'firebase/auth';
import {
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  Unsubscribe,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { auth, db, rtdb } from '@/lib/firebase/client';
import { UserProfile } from '@/lib/types';
import { ref, onValue, onDisconnect, set, serverTimestamp as rtdbServerTimestamp } from 'firebase/database';


interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  token: string | null;
  claims: { [key: string]: any } | null;
  loading: boolean;
  setToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  token: null,
  claims: null,
  loading: true,
  setToken: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [claims, setClaims] = useState<{ [key: string]: any } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: Unsubscribe | undefined;
    let presenceRef: any;

    const unsubscribeAuth = onIdTokenChanged(auth, async (authUser) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
      if (presenceRef) {
        onDisconnect(presenceRef).cancel();
      }

      if (authUser) {
        const tokenResult = await authUser.getIdTokenResult();
        setUser(authUser);
        setToken(tokenResult.token);
        setClaims(tokenResult.claims);

        const userDocRef = doc(db, 'users', authUser.uid);
        
        // --- PRESENCE SYSTEM (RTDB + FIRESTORE) ---
        presenceRef = ref(rtdb, `/status/${authUser.uid}`);
        
        // Firestore and RTDB status are now managed by this listener
        onValue(ref(rtdb, '.info/connected'), (snapshot) => {
          if (snapshot.val() === false) {
            // Not connected. We can't do anything, but onDisconnect will handle it.
            // This is a Firestore-only update for graceful shutdown.
             updateDoc(userDocRef, {
                status: 'offline',
                lastSeen: serverTimestamp()
            });
            return;
          }
          // When we connect, set our status to online.
          set(presenceRef, { status: 'online', lastSeen: rtdbServerTimestamp() })
            .then(() => {
                // Also update firestore
                updateDoc(userDocRef, {
                    status: 'available', // Use 'available' as the default online state in Firestore
                    lastSeen: serverTimestamp()
                });
            });
           // When we disconnect, update our status to offline
           onDisconnect(presenceRef).set({ status: 'offline', lastSeen: rtdbServerTimestamp() })
            .then(() => {
                 updateDoc(userDocRef, {
                    status: 'offline',
                    lastSeen: serverTimestamp()
                });
            })
        });

        
        unsubscribeProfile = onSnapshot(userDocRef, async (docSnap) => {
            if (docSnap.exists()) {
              const newProfileData = { id: docSnap.id, ...docSnap.data() } as UserProfile;
              setUserProfile(newProfileData);
              setLoading(false);
            } else {
              try {
                await setDoc(userDocRef, {
                  id: authUser.uid,
                  email: authUser.email,
                  role: 'player',
                  status: "available",
                  name: authUser.displayName || authUser.email?.split('@')[0] || 'New Player',
                  avatarUrl: authUser.photoURL || `https://placehold.co/100x100.png`,
                  bio: '',
                  primaryGame: "Valorant",
                  skills: [],
                  rank: '',
                  friends: [],
                  blocked: [],
                  lookingForTeam: false,
                  country: '',
                  disabled: false,
                  isCertifiedStreamer: false,
                  createdAt: serverTimestamp(),
                  lastSeen: serverTimestamp()
                });
              } catch (error) {
                console.error("Error creating user document in onSnapshot:", error);
                setUserProfile(null);
                setLoading(false);
              }
            }
          },
          (error) => {
            console.error('Auth context profile listener error:', error);
            setUserProfile(null);
            setLoading(false);
          }
        );
      } else {
        // User logged out
        if (user?.uid && presenceRef) {
            set(presenceRef, { status: 'offline', lastSeen: rtdbServerTimestamp() });
        }
        setUser(null);
        setUserProfile(null);
        setToken(null);
        setClaims(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
       if (user?.uid && presenceRef) {
        onDisconnect(presenceRef).cancel();
        set(presenceRef, { status: 'offline', lastSeen: rtdbServerTimestamp() });
      }
    };
  }, [user?.uid]);

  return (
    <AuthContext.Provider value={{ user, userProfile, token, claims, loading, setToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
