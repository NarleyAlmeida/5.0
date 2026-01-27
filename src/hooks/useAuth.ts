import { useEffect, useState } from 'react';
import { onAuthStateChanged, reload, signOut, type User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import type { UserProfile, ThemeMode } from '../types';
import { getAuthInstance, getFirestoreInstance } from '../config/firebase';
import { getEnvConfig, isFirebaseEnabled } from '../config/env';
import { USERS_COLLECTION } from '../config/constants';
import {
  formatAuthError,
  isAllowedEmail,
  createUserProfile,
  getUserProfile,
} from '../services/authService';
import { parseTheme } from '../utils/theme';
import { normalizeEmail } from '../utils/string';

interface UseAuthReturn {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  blocked: string | null;
  isAdmin: boolean;
}

/**
 * Hook para gerenciar autenticação e perfil do usuário
 */
export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseEnabled()) {
      setLoading(false);
      return;
    }

    const auth = getAuthInstance();
    const db = getFirestoreInstance();
    if (!auth || !db) {
      setLoading(false);
      return;
    }

    let active = true;
    const config = getEnvConfig();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!active) return;

      setUser(firebaseUser);
      setProfile(null);
      setError(null);
      setBlocked(null);
      setLoading(true);

      if (!firebaseUser) {
        setLoading(false);
        return;
      }

      try {
        const email = firebaseUser.email || '';

        // Verificar domínio permitido
        if (!isAllowedEmail(email)) {
          setBlocked(`Acesso restrito a contas @${config.allowedEmailDomain}.`);
          await signOut(auth);
          setLoading(false);
          return;
        }

        // Recarregar dados do usuário
        try {
          await reload(firebaseUser);
        } catch (err) {
          setError(formatAuthError(err));
        }

        // Verificar email verificado
        if (!firebaseUser.emailVerified) {
          setBlocked('Confirme o e-mail para acessar a plataforma.');
          setLoading(false);
          return;
        }

        // Buscar ou criar perfil
        const now = new Date().toISOString();
        const userRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
        let userProfile: UserProfile;

        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          // Criar novo perfil
          userProfile = await createUserProfile(db, firebaseUser);
        } else {
          // Atualizar perfil existente
          const data = snap.data() as Partial<UserProfile>;
          userProfile = {
            uid: firebaseUser.uid,
            email: data.email ?? email,
            name: data.name ?? firebaseUser.displayName ?? '',
            photoURL: data.photoURL ?? firebaseUser.photoURL ?? '',
            role: data.role === 'admin' ? 'admin' : 'user',
            active: data.active ?? true,
            triageCount: data.triageCount ?? 0,
            theme: parseTheme(data.theme),
            createdAt: data.createdAt ?? now,
            updatedAt: now,
          };

          // Migrar dados se necessário
          const needsMerge =
            !data.email || !data.name || !data.role || data.active === undefined || !data.createdAt;
          if (needsMerge && !data.name && userProfile.name) {
            await updateDoc(userRef, { name: userProfile.name, updatedAt: now });
          }
        }

        // Verificar se conta está ativa
        if (!userProfile.active) {
          setBlocked('Conta desativada. Procure um administrador.');
          await signOut(auth);
          setLoading(false);
          return;
        }

        if (active) {
          setProfile(userProfile);
          setError(null);
          setBlocked(null);
        }
      } catch (err) {
        if (active) {
          const message = formatAuthError(err);
          setError(message);
          if ((err as { code?: string }).code === 'permission-denied') {
            setError('Aplique as regras do Firestore e tente novamente.');
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Sincronizar perfil em tempo real
  useEffect(() => {
    if (!user || !user.emailVerified) return;

    const db = getFirestoreInstance();
    if (!db) return;

    const userRef = doc(db, USERS_COLLECTION, user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        if (!snap.exists()) {
          setBlocked('Perfil não encontrado. Procure um administrador.');
          return;
        }

        const data = snap.data() as Partial<UserProfile>;
        const updatedProfile: UserProfile = {
          uid: user.uid,
          email: data.email ?? user.email ?? '',
          name: data.name ?? user.displayName ?? '',
          photoURL: data.photoURL ?? user.photoURL ?? '',
          role: data.role === 'admin' ? 'admin' : 'user',
          active: data.active ?? true,
          triageCount: data.triageCount ?? 0,
          theme: parseTheme(data.theme),
          createdAt: data.createdAt ?? '',
          updatedAt: data.updatedAt ?? '',
        };

        if (!updatedProfile.active) {
          setBlocked('Conta desativada. Procure um administrador.');
          return;
        }

        setProfile(updatedProfile);
      },
      (err) => {
        setError(formatAuthError(err));
      }
    );

    return () => unsubscribe();
  }, [user?.uid, user?.emailVerified]);

  const isAdmin = profile?.role === 'admin' || false;

  return {
    user,
    profile,
    loading,
    error,
    blocked,
    isAdmin,
  };
};
