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
  getDocFromServer,
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
  loading: boolean;
  setToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  token: null,
  loading: true,
  setToken: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
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

        if (tokenResult.claims.role === 'admin') {
          const userDocRef = doc(db, 'users', authUser.uid);
          const docSnap = await getDocFromServer(userDocRef);
          if (docSnap.exists() && docSnap.data().role !== 'admin') {
            await updateDoc(userDocRef, { role: 'admin' });
          }
        }
        
        const userDocRef = doc(db, 'users', authUser.uid);
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
    <AuthContext.Provider value={{ user, userProfile, token, loading, setToken }}>
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
