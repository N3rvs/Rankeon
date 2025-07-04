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
  getDoc,
  setDoc,
  serverTimestamp,
  updateDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
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
        setUser(authUser);
        const tokenResult = await authUser.getIdTokenResult(true);
        setToken(tokenResult.token);
        setClaims(tokenResult.claims);

        const userDocRef = doc(db, 'users', authUser.uid);
        
        // This is a robust check to ensure the user profile document exists.
        // It runs every time auth state changes, fixing cases where a user
        // exists in Auth but not in Firestore.
        const userSnap = await getDoc(userDocRef);
        if (!userSnap.exists()) {
          try {
            await setDoc(userDocRef, {
              id: authUser.uid,
              email: authUser.email,
              role: 'player',
              name: authUser.displayName || authUser.email?.split('@')[0] || 'New Player',
              avatarUrl: authUser.photoURL || `https://placehold.co/100x100.png`,
              bio: '',
              games: [],
              skills: [],
              friends: [], // Ensure friends array is created
              blocked: [], // Ensure blocked array is created
              lookingForTeam: false,
              country: '',
              disabled: false,
              createdAt: serverTimestamp(),
            });
          } catch (error) {
            console.error("Error creating user document in AuthProvider:", error);
          }
        }
        
        // This syncs the 'admin' role from Custom Claims to Firestore if needed.
        if (tokenResult.claims.role === 'admin') {
          // We can re-use the userSnap from the check above.
          if (userSnap.exists() && userSnap.data().role !== 'admin') {
            await updateDoc(userDocRef, { role: 'admin' });
          }
        }
        
        // Finally, set up the real-time listener for profile changes.
        unsubscribeProfile = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              setUserProfile({ id: docSnap.id, ...docSnap.data() } as UserProfile);
            } else {
              setUserProfile(null);
            }
            setLoading(false);
          },
          (error) => {
            console.error('Auth context profile listener error:', error);
            setUserProfile(null);
            setLoading(false);
          }
        );
      } else {
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
  
  // This middleware intercepts fetch requests to add the auth token.
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      // We only want to intercept our own server action calls.
      if (typeof input === 'string' && input.includes('__action__')) {
        const headers = new Headers(init?.headers);
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        const newInit = { ...init, headers };
        return originalFetch(input, newInit);
      }
      return originalFetch(input, init);
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, [token]);

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

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    );
  }

  return <>{children}</>;
}
