// firebase-config.ts - Firebase Firestore Configuration
// Firebase Project: gen-lang-client-0392782201

export const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyFakeKeyForLocalFallback",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "gen-lang-client-0392782201.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0392782201",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "gen-lang-client-0392782201.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "4955742628",
  appId: process.env.FIREBASE_APP_ID || "1:4955742628:web:abcdef123456",
  firestoreDatabaseId: process.env.FIRESTORE_DATABASE_ID || "(default)",
};

export default firebaseConfig;
