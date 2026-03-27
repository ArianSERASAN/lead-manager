import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { AppUser } from '../types/domain';

interface AuthContextType {
  firebaseUser: User | null;
  appUser: AppUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  appUser: null,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        // Try to get or create user profile
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setAppUser({ uid: user.uid, ...userSnap.data() } as AppUser);
          // Update last login
          await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
        } else {
          // Auto-create admin user for first user
          const newUser: Omit<AppUser, 'uid'> = {
            email: user.email || '',
            name: user.email?.split('@')[0] || 'Admin',
            role: 'admin',
            active: true,
            createdAt: serverTimestamp() as any,
            lastLogin: serverTimestamp() as any,
          };
          await setDoc(userRef, newUser);
          setAppUser({ uid: user.uid, ...newUser } as AppUser);
        }
      } else {
        setAppUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
    setAppUser(null);
  };

  return (
    <AuthContext.Provider value={{ firebaseUser, appUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
