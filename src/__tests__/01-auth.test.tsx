/**
 * Test 1: Autenticación — AuthContext maneja login/logout correctamente
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

// ─── Firebase mocks ──────────────────────────────────────────────

let authStateCallback: ((user: unknown) => void) | null = null;

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  onAuthStateChanged: vi.fn((_auth: unknown, cb: (user: unknown) => void) => {
    authStateCallback = cb;
    return vi.fn(); // unsubscribe
  }),
  signOut: vi.fn(() => Promise.resolve()),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn((...args: unknown[]) => ({ path: args.slice(1).join('/') })),
  getDoc: vi.fn(() => Promise.resolve({
    exists: () => true,
    data: () => ({
      email: 'admin@serasan.es',
      name: 'Admin',
      role: 'admin',
      active: true,
      createdAt: new Date(),
    }),
  })),
  setDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => new Date()),
}));

vi.mock('../lib/firebase', () => ({
  auth: {},
  db: {},
}));

// ─── Test consumer component ────────────────────────────────────

function AuthConsumer() {
  const { firebaseUser, appUser, loading, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{appUser?.name || 'none'}</span>
      <span data-testid="email">{appUser?.email || 'none'}</span>
      <span data-testid="role">{appUser?.role || 'none'}</span>
      <span data-testid="firebase-user">{firebaseUser ? 'logged-in' : 'logged-out'}</span>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

// ─── Tests ──────────────────────────────────────────────────────

describe('AuthContext', () => {
  beforeEach(() => {
    authStateCallback = null;
    vi.clearAllMocks();
  });

  it('empieza en estado loading', () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
  });

  it('carga el usuario autenticado desde Firestore', async () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    // Simulate Firebase auth state change → user logged in
    await act(async () => {
      authStateCallback?.({
        uid: 'user-1',
        email: 'admin@serasan.es',
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('user')).toHaveTextContent('Admin');
      expect(screen.getByTestId('email')).toHaveTextContent('admin@serasan.es');
      expect(screen.getByTestId('role')).toHaveTextContent('admin');
      expect(screen.getByTestId('firebase-user')).toHaveTextContent('logged-in');
    });
  });

  it('establece appUser a null cuando no hay sesión', async () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await act(async () => {
      authStateCallback?.(null);
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('user')).toHaveTextContent('none');
      expect(screen.getByTestId('firebase-user')).toHaveTextContent('logged-out');
    });
  });

  it('logout limpia el estado del usuario', async () => {
    const { signOut } = await import('firebase/auth');

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    // Login first
    await act(async () => {
      authStateCallback?.({ uid: 'user-1', email: 'admin@serasan.es' });
    });

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Admin');
    });

    // Click logout
    await act(async () => {
      screen.getByText('Logout').click();
    });

    expect(signOut).toHaveBeenCalled();
  });
});
