import { initializeApp, deleteApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppUser, UserRole } from '../types/domain';

const USERS_COLLECTION = 'users';

// Secondary Firebase app to create users without signing out the current admin
function getSecondaryAuth() {
  const existingApp = getApps().find(a => a.name === 'secondaryAuth');
  if (existingApp) {
    return getAuth(existingApp);
  }
  // Use the same config as the primary app
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
  const secondaryApp = initializeApp(config, 'secondaryAuth');
  return getAuth(secondaryApp);
}

/**
 * Create a new user account (Firebase Auth + Firestore profile).
 * Uses a secondary Firebase app so the admin stays logged in.
 */
export async function createUser(
  email: string,
  password: string,
  name: string,
  role: UserRole
): Promise<AppUser> {
  const secondaryAuth = getSecondaryAuth();

  // Create Firebase Auth account
  const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  const uid = credential.user.uid;

  // Sign out from secondary auth immediately
  await secondaryAuth.signOut();

  // Create Firestore user profile
  const userData: Omit<AppUser, 'uid'> = {
    email,
    name,
    role,
    active: true,
    createdAt: serverTimestamp() as any,
  };

  await setDoc(doc(db, USERS_COLLECTION, uid), userData);

  return { uid, ...userData };
}

/**
 * Fetch all users from Firestore.
 */
export async function fetchAllUsers(): Promise<AppUser[]> {
  const snapshot = await getDocs(
    query(collection(db, USERS_COLLECTION), orderBy('name'))
  );
  return snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as AppUser));
}

/**
 * Subscribe to real-time user list changes.
 */
export function subscribeToUsers(callback: (users: AppUser[]) => void): Unsubscribe {
  const q = query(collection(db, USERS_COLLECTION), orderBy('name'));
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as AppUser));
    callback(users);
  });
}

/**
 * Update a user's role.
 */
export async function updateUserRole(userId: string, newRole: UserRole): Promise<void> {
  await updateDoc(doc(db, USERS_COLLECTION, userId), { role: newRole });
}

/**
 * Update a user's name.
 */
export async function updateUserName(userId: string, name: string): Promise<void> {
  await updateDoc(doc(db, USERS_COLLECTION, userId), { name });
}

/**
 * Toggle a user's active state.
 */
export async function toggleUserActive(userId: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, USERS_COLLECTION, userId), { active });
}

/**
 * Update multiple user fields at once.
 */
export async function updateUserProfile(
  userId: string,
  data: Partial<Pick<AppUser, 'name' | 'role' | 'active'>>
): Promise<void> {
  await updateDoc(doc(db, USERS_COLLECTION, userId), data);
}
