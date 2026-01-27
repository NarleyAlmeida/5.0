import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  reload,
  updateProfile,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  type User,
  type ActionCodeSettings,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  type Firestore,
} from 'firebase/firestore';
import type { UserProfile, UserRole, ThemeMode } from '../types';
import { USERS_COLLECTION, ADMIN_REQUESTS_COLLECTION } from '../config/constants';
import { getEnvConfig } from '../config/env';
import { parseTheme } from '../utils/theme';
import { normalizeEmail } from '../utils/string';
import { getAuthInstance, getFirestoreInstance } from '../config/firebase';

/**
 * Erros de autenticação formatados em português
 */
export const formatAuthError = (error: unknown): string => {
  const err = error as { code?: string; message?: string };
  const code = err.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'E-mail inválido.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Credenciais inválidas.';
    case 'auth/email-already-in-use':
      return 'Este e-mail já está cadastrado.';
    case 'auth/weak-password':
      return 'Senha muito fraca. Use pelo menos 6 caracteres.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Tente novamente mais tarde.';
    case 'auth/network-request-failed':
      return 'Erro de conexão. Verifique sua internet.';
    case 'auth/requires-recent-login':
      return 'Por segurança, faça login novamente.';
    case 'auth/user-disabled':
      return 'Conta desativada. Procure um administrador.';
    default:
      return err.message || 'Erro desconhecido. Tente novamente.';
  }
};

/**
 * Verifica se o email é permitido
 */
export const isAllowedEmail = (email: string): boolean => {
  const config = getEnvConfig();
  return normalizeEmail(email).endsWith(`@${config.allowedEmailDomain}`);
};

/**
 * Obtém URL de ação de autenticação
 */
export const getAuthActionUrl = (): string => {
  const config = getEnvConfig();
  if (config.authActionUrl) return config.authActionUrl;
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
};

/**
 * Obtém configurações de ação de autenticação
 */
export const getAuthActionSettings = (): ActionCodeSettings => {
  const config = getEnvConfig();
  const settings: ActionCodeSettings = {
    url: getAuthActionUrl(),
    handleCodeInApp: true,
  };
  if (config.authLinkDomain) {
    settings.linkDomain = config.authLinkDomain;
  }
  if (config.authDynamicLinkDomain) {
    settings.dynamicLinkDomain = config.authDynamicLinkDomain;
  }
  return settings;
};

/**
 * Cria perfil de usuário no Firestore
 */
export const createUserProfile = async (
  db: Firestore,
  user: User,
  name?: string
): Promise<UserProfile> => {
  const email = user.email || '';
  const now = new Date().toISOString();
  const profile: UserProfile = {
    uid: user.uid,
    email,
    name: name || user.displayName || '',
    photoURL: user.photoURL || '',
    role: 'user',
    active: true,
    triageCount: 0,
    theme: 'system',
    createdAt: now,
    updatedAt: now,
  };
  const userRef = doc(db, USERS_COLLECTION, user.uid);
  await setDoc(userRef, profile);
  return profile;
};

/**
 * Obtém perfil de usuário do Firestore
 */
export const getUserProfile = async (
  db: Firestore,
  uid: string
): Promise<UserProfile | null> => {
  const userRef = doc(db, USERS_COLLECTION, uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  const data = snap.data() as Partial<UserProfile>;
  return {
    uid,
    email: data.email || '',
    name: data.name || '',
    photoURL: data.photoURL || '',
    role: data.role === 'admin' ? 'admin' : 'user',
    active: data.active ?? true,
    triageCount: data.triageCount ?? 0,
    theme: parseTheme(data.theme),
    createdAt: data.createdAt || '',
    updatedAt: data.updatedAt || '',
  };
};

/**
 * Atualiza perfil de usuário
 */
export const updateUserProfile = async (
  db: Firestore,
  uid: string,
  updates: Partial<UserProfile>
): Promise<void> => {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
};

/**
 * Registra novo usuário
 */
export const registerUser = async (
  email: string,
  password: string,
  name: string,
  rememberMe: boolean = true
): Promise<User> => {
  const auth = getAuthInstance();
  if (!auth) throw new Error('Firebase não está configurado');

  // Validação de email
  if (!isAllowedEmail(email)) {
    const config = getEnvConfig();
    throw new Error(`Acesso restrito a contas @${config.allowedEmailDomain}`);
  }

  // Validação de senha
  if (password.length < 6) {
    throw new Error('Senha deve ter pelo menos 6 caracteres');
  }

  // Configurar persistência
  await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);

  // Criar usuário
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Atualizar nome no Firebase Auth
  if (name) {
    await updateProfile(user, { displayName: name });
  }

  // Criar perfil no Firestore
  const db = getFirestoreInstance();
  if (db) {
    await createUserProfile(db, user, name);
  }

  // Enviar email de verificação
  await sendEmailVerification(user, getAuthActionSettings());

  return user;
};

/**
 * Faz login do usuário
 */
export const loginUser = async (
  email: string,
  password: string,
  rememberMe: boolean = true
): Promise<User> => {
  const auth = getAuthInstance();
  if (!auth) throw new Error('Firebase não está configurado');

  // Configurar persistência
  await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);

  // Fazer login
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

/**
 * Faz logout do usuário
 */
export const logoutUser = async (): Promise<void> => {
  const auth = getAuthInstance();
  if (!auth) return;
  await signOut(auth);
};

/**
 * Envia email de recuperação de senha
 */
export const sendPasswordReset = async (email: string): Promise<void> => {
  const auth = getAuthInstance();
  if (!auth) throw new Error('Firebase não está configurado');
  await sendPasswordResetEmail(auth, email, getAuthActionSettings());
};

/**
 * Reenvia email de verificação
 */
export const resendVerificationEmail = async (user: User): Promise<void> => {
  await sendEmailVerification(user, getAuthActionSettings());
};

/**
 * Deleta conta do usuário (requer reautenticação)
 */
export const deleteUserAccount = async (user: User, password: string): Promise<void> => {
  const auth = getAuthInstance();
  if (!auth) throw new Error('Firebase não está configurado');

  // Reautenticar
  const credential = EmailAuthProvider.credential(user.email!, password);
  await reauthenticateWithCredential(user, credential);

  // Deletar do Firestore primeiro
  const db = getFirestoreInstance();
  if (db) {
    const userRef = doc(db, USERS_COLLECTION, user.uid);
    await updateDoc(userRef, {
      deletedAt: new Date().toISOString(),
      active: false,
      updatedAt: new Date().toISOString(),
    });
  }

  // Deletar do Firebase Auth
  await deleteUser(user);
};

/**
 * Verifica se usuário é admin
 */
export const isAdminEmail = (email: string): boolean => {
  const config = getEnvConfig();
  return config.adminEmails.includes(normalizeEmail(email));
};

/**
 * Incrementa contador de triagens
 */
export const incrementTriageCount = async (db: Firestore, uid: string): Promise<void> => {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userRef, {
    triageCount: increment(1),
    updatedAt: new Date().toISOString(),
  });
};
