import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getEnvConfig, isFirebaseEnabled } from './env';

let firebaseApp: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

/**
 * Inicializa o Firebase se as configurações estiverem disponíveis
 */
export const initializeFirebase = (): {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  enabled: boolean;
} => {
  if (firebaseApp) {
    return { app: firebaseApp, auth, db, enabled: isFirebaseEnabled() };
  }

  const enabled = isFirebaseEnabled();
  if (!enabled) {
    return { app: null, auth: null, db: null, enabled: false };
  }

  const config = getEnvConfig();
  firebaseApp = initializeApp(config.firebase);
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);

  if (auth) {
    auth.languageCode = 'pt-BR';
  }

  return { app: firebaseApp, auth, db, enabled: true };
};

/**
 * Obtém instâncias do Firebase (inicializa se necessário)
 */
export const getFirebase = () => {
  if (!firebaseApp) {
    return initializeFirebase();
  }
  return { app: firebaseApp, auth, db, enabled: isFirebaseEnabled() };
};

/**
 * Obtém apenas o Auth
 */
export const getAuthInstance = (): Auth | null => {
  const { auth } = getFirebase();
  return auth;
};

/**
 * Obtém apenas o Firestore
 */
export const getFirestoreInstance = (): Firestore | null => {
  const { db } = getFirebase();
  return db;
};
