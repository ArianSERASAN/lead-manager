import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { AppUser } from '../types/domain';

interface AuthContextType {
  firebaseUser: User | null;
  appUser: AppUser | null;
  loading: boolean;
  authError: string | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  appUser: null,
  loading: true,
  authError: null,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthError(null);

      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            setAppUser({ uid: user.uid, ...userSnap.data() } as AppUser);
            // Update last login (non-blocking)
            setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true }).catch(console.error);
          } else {
            // Auto-create admin user for first user
            const newUser: Omit<AppUser, 'uid'> = {
              email: user.email || '',
              name: user.email?.split('@')[0] || 'Admin',
              role: 'admin',
              active: true,
              createdAt: serverTimestamp() as unknown as AppUser['createdAt'],
              lastLogin: serverTimestamp() as unknown as AppUser['lastLogin'],
            };
            await setDoc(userRef, newUser);
            setAppUser({ uid: user.uid, ...newUser } as AppUser);
          }
        } catch (err) {
          console.error('Error loading user profile:', err);
          setAuthError('Error al cargar el perfil de usuario. Comprueba tu conexión e inténtalo de nuevo.');
          // Still set basic user info so the app doesn't hang
          setAppUser({
            uid: user.uid,
            email: user.email || '',
            name: user.email?.split('@')[0] || 'Usuario',
            role: 'read_only',
            active: true,
            createdAt: null as unknown as AppUser['createdAt'],
          });
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
    <AuthContext.Provider value={{ firebaseUser, appUser, loading, authError, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
