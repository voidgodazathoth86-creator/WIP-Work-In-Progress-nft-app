// Firebase config - SECURE - uses AI Studio secret, fake fallback for GitHub safety
export const firebaseConfig = {
  projectId: "gen-lang-client-0392782201",
  appId: "1:1055101967195:web:060df0b612065ca1d7587e",
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyFakeKeyForLocalFallback",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "gen-lang-client-0392782201.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-remixcrosschainn-c82235fc-446a-4768-82bc-9006a56ccee0",
  storageBucket: "gen-lang-client-0392782201.firebasestorage.app",
  messagingSenderId: "1055101967195",
};

// Firestore collections from your blueprint
export const FIRESTORE_COLLECTIONS = {
  nfts: "nfts",
  collections: "collections", 
  transactions: "transactions",
  royalties: "royalties",
  bridge_transactions: "bridge_transactions",
  // Extra for cross-device sync
  users: "users",
  portfolios: "portfolios",
  favorites: "favorites"
};
