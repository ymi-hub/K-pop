import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBPM4W4DyxuRPKusKf5VgJwl0oIjPFWEhc',
  authDomain: 'k-pop-e9f48.firebaseapp.com',
  projectId: 'k-pop-e9f48',
  storageBucket: 'k-pop-e9f48.firebasestorage.app',
  messagingSenderId: '843335185954',
  appId: '1:843335185954:web:73cf32d90532373fe9bc7b',
  measurementId: 'G-T7MN478EQN',
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

if (firebaseConfig.apiKey) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  db = getFirestore(app);
  auth = getAuth(app);
}

export { db, auth };
export const googleProvider = new GoogleAuthProvider();
export default app;
