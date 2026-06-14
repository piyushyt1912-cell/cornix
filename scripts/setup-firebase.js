/**
 * Firebase Setup Script
 * 
 * This script creates the initial admin and receptionist accounts in Firebase Auth
 * and writes their role documents to Firestore.
 * 
 * Prerequisites: 
 *   1. Firebase CLI must be logged in: firebase login
 *   2. .env file must exist with Firebase config
 * 
 * Usage: node scripts/setup-firebase.js
 */

require('dotenv').config();

const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signOut } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

// Read config from environment variables (never hardcode API keys)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Validate config
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('ERROR: Missing Firebase config. Make sure .env file exists with NEXT_PUBLIC_FIREBASE_* variables.');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const DEFAULT_USERS = [
  { email: 'admin@corenix.com', password: 'admin123', role: 'admin' },
  { email: 'reception@corenix.com', password: 'reception123', role: 'receptionist' }
];

async function setup() {
  console.log(`\n🔧 Firebase Setup - Project: ${firebaseConfig.projectId}`);
  console.log('─'.repeat(50));

  for (const user of DEFAULT_USERS) {
    try {
      console.log(`\n👤 Creating user: ${user.email} (${user.role})`);
      const credential = await createUserWithEmailAndPassword(auth, user.email, user.password);
      
      // Write role document
      await setDoc(doc(db, 'users', credential.user.uid), {
        email: user.email,
        role: user.role,
        createdAt: new Date().toISOString()
      });
      
      console.log(`   ✅ Created successfully (UID: ${credential.user.uid})`);
      await signOut(auth);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        console.log(`   ⏭️  User already exists, skipping.`);
      } else {
        console.error(`   ❌ Error: ${err.message}`);
      }
    }
  }

  console.log('\n─'.repeat(50));
  console.log('✅ Setup complete!\n');
  console.log('⚠️  IMPORTANT: Change the default passwords immediately after first login.');
  console.log('   Admin: admin@corenix.com');
  console.log('   Reception: reception@corenix.com\n');
  process.exit(0);
}

setup().catch(err => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
