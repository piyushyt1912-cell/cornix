'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { 
  login as authLogin, 
  logout as authLogout, 
  onAuthChange, 
  getUserRole, 
  seedDefaultUsers, 
  resetPassword as authResetPassword,
  changePassword as authChangePassword,
  logSessionTimeout,
  AppUser, 
  UserRole 
} from '@/lib/auth';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  resetPassword: async () => {},
  changePassword: async () => {},
});

// Session timeout: 30 minutes of inactivity
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const ACTIVITY_CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const lastActivityRef = useRef<number>(Date.now());
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Track user activity for session timeout
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Session timeout checker
  useEffect(() => {
    if (!user) return;

    // Listen for user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    events.forEach(event => window.addEventListener(event, updateActivity, { passive: true }));

    // Check for inactivity every minute
    sessionTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= SESSION_TIMEOUT_MS) {
        // Session expired — log and force logout
        logSessionTimeout(user.uid, user.email);
        authLogout().then(() => {
          setUser(null);
          // Show notification (non-blocking)
          if (typeof window !== 'undefined') {
            alert('Your session has expired due to inactivity. Please log in again.');
          }
        }).catch(() => {
          setUser(null);
        });
      }
    }, ACTIVITY_CHECK_INTERVAL_MS);

    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    };
  }, [user, updateActivity]);

  useEffect(() => {
    // Fire-and-forget: seed default users in background, don't block auth listener
    seedDefaultUsers().catch(() => {});

    // Start auth listener immediately — do NOT wait for seeding
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const role = await getUserRole(firebaseUser.uid, firebaseUser.email || undefined);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            role
          });
          // Reset activity timer on auth state change
          lastActivityRef.current = Date.now();
        } catch {
          // If role fetch fails completely, still log user in with inferred role
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            role: firebaseUser.email?.startsWith('admin') ? 'admin' : 'receptionist'
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Safety: if onAuthStateChanged never fires (e.g. Firebase Auth not configured),
    // stop showing the loading screen after 5 seconds
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const appUser = await authLogin(email, password);
    setUser(appUser);
    lastActivityRef.current = Date.now(); // Reset timer on login
  };

  const logout = async () => {
    await authLogout();
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    await authResetPassword(email);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await authChangePassword(currentPassword, newPassword);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, resetPassword, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export type { UserRole, AppUser };
