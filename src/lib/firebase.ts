// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, CACHE_SIZE_UNLIMITED, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if all required environment variables are set
export const isFirebaseConfigured = !!firebaseConfig.apiKey &&
  !!firebaseConfig.authDomain &&
  !!firebaseConfig.projectId;

const app = isFirebaseConfigured ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()) : null;
export const auth = app ? getAuth(app) : null;
export const storage = app ? getStorage(app) : null;

// Initialize Firestore with offline persistence
let db = null;
if (app) {
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ cacheSizeBytes: CACHE_SIZE_UNLIMITED }),
    });
  } catch (err: any) {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence failed: multiple tabs open. Using memory cache.');
      // Fallback to in-memory cache if multiple tabs are open
      db = getFirestore(app);
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence not available in this browser. Using memory cache.');
      // Fallback for browsers that don't support persistence
      db = getFirestore(app);
    } else {
        console.error("Firestore initialization failed:", err);
        // Fallback for other errors
        db = getFirestore(app);
    }
  }
}
export { db };


// Connect to emulators in development
if (process.env.NODE_ENV === 'development' && auth && db) {
    // Note: You will need to have the Firebase Local Emulator Suite running
    // connectAuthEmulator(auth, 'http://localhost:9099');
    // connectFirestoreEmulator(db, 'localhost', 8080);
}

export { app };
