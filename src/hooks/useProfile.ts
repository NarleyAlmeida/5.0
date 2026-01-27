import { useState, useCallback } from 'react';
import { updateProfile as updateFirebaseProfile } from 'firebase/auth';
import type { UserProfile, ThemeMode } from '../types';
import { getAuthInstance, getFirestoreInstance } from '../config/firebase';
import { updateUserProfile } from '../services/authService';
import { parseTheme } from '../utils/theme';

interface UseProfileReturn {
  updateName: (name: string) => Promise<void>;
  updatePhotoURL: (photoURL: string) => Promise<void>;
  updateTheme: (theme: ThemeMode) => Promise<void>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook para gerenciar atualizações do perfil do usuário
 */
export const useProfile = (userProfile: UserProfile | null): UseProfileReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateName = useCallback(
    async (name: string) => {
      if (!userProfile) {
        setError('Usuário não autenticado');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const auth = getAuthInstance();
        const db = getFirestoreInstance();

        if (!auth || !db) {
          throw new Error('Firebase não está configurado');
        }

        const user = auth.currentUser;
        if (!user) {
          throw new Error('Usuário não encontrado');
        }

        // Atualizar no Firebase Auth
        await updateFirebaseProfile(user, { displayName: name });

        // Atualizar no Firestore
        await updateUserProfile(db, userProfile.uid, { name });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar nome';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [userProfile]
  );

  const updatePhotoURL = useCallback(
    async (photoURL: string) => {
      if (!userProfile) {
        setError('Usuário não autenticado');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const auth = getAuthInstance();
        const db = getFirestoreInstance();

        if (!auth || !db) {
          throw new Error('Firebase não está configurado');
        }

        const user = auth.currentUser;
        if (!user) {
          throw new Error('Usuário não encontrado');
        }

        // Atualizar no Firebase Auth
        await updateFirebaseProfile(user, { photoURL });

        // Atualizar no Firestore
        await updateUserProfile(db, userProfile.uid, { photoURL });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar foto';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [userProfile]
  );

  const updateTheme = useCallback(
    async (theme: ThemeMode) => {
      if (!userProfile) {
        setError('Usuário não autenticado');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const db = getFirestoreInstance();
        if (!db) {
          throw new Error('Firebase não está configurado');
        }

        // Validar tema
        const normalizedTheme = parseTheme(theme);

        // Atualizar no Firestore
        await updateUserProfile(db, userProfile.uid, { theme: normalizedTheme });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar tema';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [userProfile]
  );

  return {
    updateName,
    updatePhotoURL,
    updateTheme,
    loading,
    error,
  };
};
