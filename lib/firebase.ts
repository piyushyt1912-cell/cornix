import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const;

function validateEnv() {
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) throw new Error("Missing NEXT_PUBLIC_FIREBASE_API_KEY");
  if (!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) throw new Error("Missing NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) throw new Error("Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  if (!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) throw new Error("Missing NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET");
  if (!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) throw new Error("Missing NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID");
  if (!process.env.NEXT_PUBLIC_FIREBASE_APP_ID) throw new Error("Missing NEXT_PUBLIC_FIREBASE_APP_ID");
}

function getFirebaseApp() {
  if (getApps().length > 0) return getApp();

  validateEnv();

  return initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
}

const app = getFirebaseApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
