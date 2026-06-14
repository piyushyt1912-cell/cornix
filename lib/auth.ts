import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User
} from 'firebase/auth';
import { doc, getDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import { auth, db } from './firebase';
import { isPasswordValid, evaluatePasswordStrength } from './sanitize';

export type UserRole = 'admin' | 'receptionist';

export interface AppUser {
  uid: string;
  email: string;
  role: UserRole;
}

// ─── Rate Limiting ──────────────────────────────────────────────────────────

interface LoginAttemptState {
  failCount: number;
  lockedUntil: number; // timestamp
}

const RATE_LIMIT_KEY = 'corenix_login_attempts';

function getLoginAttempts(): LoginAttemptState {
  if (typeof window === 'undefined') return { failCount: 0, lockedUntil: 0 };
  try {
    const stored = sessionStorage.getItem(RATE_LIMIT_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { failCount: 0, lockedUntil: 0 };
}

function saveLoginAttempts(state: LoginAttemptState) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(state));
  }
}

function clearLoginAttempts() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(RATE_LIMIT_KEY);
  }
}

/** Get remaining lockout time in seconds, or 0 if not locked */
export function getRemainingLockoutSeconds(): number {
  const state = getLoginAttempts();
  if (state.lockedUntil <= Date.now()) return 0;
  return Math.ceil((state.lockedUntil - Date.now()) / 1000);
}

/** Check if login is currently rate-limited */
function checkRateLimit(): { allowed: boolean; waitSeconds: number } {
  const state = getLoginAttempts();
  const now = Date.now();

  if (state.lockedUntil > now) {
    return { allowed: false, waitSeconds: Math.ceil((state.lockedUntil - now) / 1000) };
  }

  return { allowed: true, waitSeconds: 0 };
}

/** Record a failed login attempt and compute lockout */
function recordFailedAttempt() {
  const state = getLoginAttempts();
  state.failCount += 1;

  // Progressive lockout
  if (state.failCount >= 10) {
    state.lockedUntil = Date.now() + 15 * 60 * 1000; // 15 minutes
  } else if (state.failCount >= 5) {
    state.lockedUntil = Date.now() + 2 * 60 * 1000; // 2 minutes
  } else if (state.failCount >= 3) {
    state.lockedUntil = Date.now() + 30 * 1000; // 30 seconds
  }

  saveLoginAttempts(state);
}

// ─── Audit Logging ──────────────────────────────────────────────────────────

type AuditEvent = 'login' | 'logout' | 'login_failed' | 'password_change' | 'password_reset_request' | 'session_timeout';

/** Log a security event to Firestore (best-effort, non-blocking) */
async function logSecurityEvent(event: AuditEvent, details: Record<string, any> = {}) {
  try {
    await addDoc(collection(db, 'security_logs'), {
      event,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      ...details,
    });
  } catch {
    // Best-effort — never block the app over audit logging
  }
}

// ─── Timeout Helper ─────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
}

// ─── Authentication ─────────────────────────────────────────────────────────

/**
 * Sign in with email and password.
 * Includes client-side rate limiting and audit logging.
 */
export async function login(email: string, password: string): Promise<AppUser> {
  // Check rate limit before attempting
  const rateCheck = checkRateLimit();
  if (!rateCheck.allowed) {
    throw new Error(`Too many failed attempts. Please wait ${rateCheck.waitSeconds} seconds before trying again.`);
  }

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const role = await getUserRole(credential.user.uid, credential.user.email || email);
    
    // Clear failed attempts on success
    clearLoginAttempts();
    
    // Audit log (fire-and-forget)
    logSecurityEvent('login', { email, uid: credential.user.uid, role });
    
    return {
      uid: credential.user.uid,
      email: credential.user.email || email,
      role
    };
  } catch (error: any) {
    // Record failed attempt
    recordFailedAttempt();
    
    // Audit log (fire-and-forget) — don't log the password!
    logSecurityEvent('login_failed', { email, errorCode: error?.code || 'unknown' });
    
    throw error;
  }
}

/**
 * Sign out the current user
 */
export async function logout(): Promise<void> {
  const currentUser = auth.currentUser;
  if (currentUser) {
    logSecurityEvent('logout', { uid: currentUser.uid, email: currentUser.email });
  }
  await firebaseSignOut(auth);
}

/**
 * Send password reset email via Firebase Auth
 */
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
  logSecurityEvent('password_reset_request', { email });
}

/**
 * Change the current user's password.
 * Requires re-authentication for security (Firebase requirement for sensitive operations).
 * Validates password strength before applying.
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error('No authenticated user. Please log in again.');
  }

  // Validate new password strength
  if (!isPasswordValid(newPassword)) {
    const strength = evaluatePasswordStrength(newPassword);
    const missing = [];
    if (!strength.requirements.minLength) missing.push('at least 8 characters');
    if (!strength.requirements.hasUppercase) missing.push('an uppercase letter');
    if (!strength.requirements.hasLowercase) missing.push('a lowercase letter');
    if (!strength.requirements.hasNumber) missing.push('a number');
    if (!strength.requirements.hasSpecialChar) missing.push('a special character');
    throw new Error(`Password must contain: ${missing.join(', ')}`);
  }

  // Prevent reusing the same password
  if (currentPassword === newPassword) {
    throw new Error('New password must be different from current password.');
  }

  // Re-authenticate first (Firebase requires this before sensitive operations)
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  try {
    await reauthenticateWithCredential(user, credential);
  } catch (error: any) {
    if (error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential') {
      throw new Error('Current password is incorrect.');
    }
    throw error;
  }

  // Update password
  await updatePassword(user, newPassword);
  
  // Audit log
  logSecurityEvent('password_change', { uid: user.uid, email: user.email });
}

/**
 * Get user role from Firestore users collection.
 * Falls back to email-based role detection if Firestore is unavailable.
 */
export async function getUserRole(uid: string, email?: string): Promise<UserRole> {
  try {
    const roleFromFirestore = getDoc(doc(db, 'users', uid)).then(snap => {
      if (snap.exists()) {
        return (snap.data().role as UserRole) || inferRoleFromEmail(email);
      }
      return inferRoleFromEmail(email);
    });
    // Timeout after 3 seconds — Firestore may be unavailable
    return await withTimeout(roleFromFirestore, 3000, inferRoleFromEmail(email));
  } catch (error) {
    console.warn('Could not fetch user role from Firestore, inferring from email.', error);
    return inferRoleFromEmail(email);
  }
}

/**
 * Infer role from email address as a fallback when Firestore is unreachable.
 */
function inferRoleFromEmail(email?: string): UserRole {
  if (!email) return 'receptionist';
  if (email.startsWith('admin')) return 'admin';
  return 'receptionist';
}

/**
 * Listen for auth state changes
 */
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/** Log session timeout event */
export function logSessionTimeout(uid: string, email: string) {
  logSecurityEvent('session_timeout', { uid, email });
}

/**
 * Seed default users via REST API (does NOT use Firebase SDK Auth, 
 * so it won't trigger onAuthStateChanged).
 * 
 * This is fire-and-forget — it NEVER blocks the app from loading.
 * SECURITY: Only runs in development mode.
 */
export async function seedDefaultUsers(): Promise<void> {
  // Only seed in development — never expose default credentials in production
  if (process.env.NODE_ENV === 'production') return;
  
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return;

  const defaults = [
    { email: 'admin@corenix.com', password: 'admin123', role: 'admin' as UserRole },
    { email: 'reception@corenix.com', password: 'reception123', role: 'receptionist' as UserRole }
  ];

  for (const user of defaults) {
    try {
      // Use REST API to create user — this does NOT trigger onAuthStateChanged
      const resp = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            password: user.password,
            returnSecureToken: false // We don't need tokens
          })
        }
      );
      
      const data = await resp.json();
      
      if (data.error) {
        if (data.error.message === 'EMAIL_EXISTS') {
          // User already exists — this is expected after first run
          continue;
        }
        console.warn(`Could not create default user ${user.email}:`, data.error.message);
        continue;
      }

      console.log(`Created default user: ${user.email} (${user.role})`);
      
      // Try to write role to Firestore (non-blocking, with timeout)
      if (data.localId) {
        try {
          await withTimeout(
            setDoc(doc(db, 'users', data.localId), {
              email: user.email,
              role: user.role,
              createdAt: new Date().toISOString()
            }),
            3000,
            undefined
          );
        } catch {
          // Firestore unavailable — role will be inferred from email
        }
      }
    } catch (err) {
      console.warn(`Seeding error for ${user.email}:`, err);
    }
  }
}
