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
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';
import { UserProfile } from '@/lib/types';

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

    const unsubscribeAuth = onIdTokenChanged(auth, async (authUser) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }

      if (authUser) {
        const tokenResult = await authUser.getIdTokenResult();
        setUser(authUser);
        setToken(tokenResult.token);
        setClaims(tokenResult.claims);

        const userDocRef = doc(db, 'users', authUser.uid);
        
        unsubscribeProfile = onSnapshot(userDocRef, async (docSnap) => {
            if (docSnap.exists()) {
              const newProfileData = { id: docSnap.id, ...docSnap.data() } as UserProfile;
              
              // This logic is removed to prevent potential infinite loops causing crashes.
              // The user's token will refresh on the next login or after an hour.
              // const claimsRefreshedAt = newProfileData._claimsRefreshedAt?.toMillis();
              // const tokenIssuedAt = tokenResult.claims.iat * 1000;
              // if (claimsRefreshedAt && claimsRefreshedAt > tokenIssuedAt) {
              //   await authUser.getIdToken(true);
              //   return;
              // }
              
              setUserProfile(newProfileData);
              setLoading(false);
            } else {
              // User exists in Auth but not Firestore. Create the document.
              // This is mainly for the first sign-up.
              try {
                await setDoc(userDocRef, {
                  id: authUser.uid,
                  email: authUser.email,
                  role: 'player', // Default role
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
                });
                // The onSnapshot will automatically re-trigger with the newly created data.
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
    };
  }, []);

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
