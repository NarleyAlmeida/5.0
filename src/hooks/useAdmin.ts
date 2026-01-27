import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import type { UserProfile, AdminRequest, UserRole } from '../types';
import { getFirestoreInstance } from '../config/firebase';
import { USERS_COLLECTION, ADMIN_REQUESTS_COLLECTION } from '../config/constants';
import { formatAuthError } from '../services/authService';
import { parseTheme } from '../utils/theme';
import { dedupeUsers, normalizeUserKey, pickPreferredUser } from '../utils/users';

interface UseAdminReturn {
  users: UserProfile[];
  adminRequests: AdminRequest[];
  loading: boolean;
  error: string | null;
  updateUser: (uid: string, updates: { name?: string; role?: UserRole; active?: boolean }) => Promise<void>;
  updateAdminRequest: (requestId: string, status: 'approved' | 'rejected') => Promise<void>;
}

/**
 * Hook para funcionalidades administrativas
 */
export const useAdmin = (isAdmin: boolean): UseAdminReturn => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [adminRequests, setAdminRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar lista de usuários
  useEffect(() => {
    if (!isAdmin) {
      setUsers([]);
      return;
    }

    const db = getFirestoreInstance();
    if (!db) return;

    const usersQuery = query(collection(db, USERS_COLLECTION));
    const unsubscribe = onSnapshot(
      usersQuery,
      (snapshot) => {
        const rawUsers = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Partial<UserProfile>;
          const role: UserRole = data.role === 'admin' ? 'admin' : 'user';
          return {
            uid: docSnap.id,
            email: data.email ?? '',
            name: data.name ?? '',
            photoURL: data.photoURL ?? '',
            role,
            active: data.active ?? true,
            triageCount: data.triageCount ?? 0,
            theme: parseTheme(data.theme),
            createdAt: data.createdAt ?? '',
            updatedAt: data.updatedAt ?? '',
          };
        });

        const deduped = dedupeUsers(rawUsers);
        deduped.sort((a, b) => {
          const nameCompare = a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
          if (nameCompare !== 0) return nameCompare;
          return a.email.localeCompare(b.email, 'pt-BR', { sensitivity: 'base' });
        });

        setUsers(deduped);
      },
      (err) => {
        setError(formatAuthError(err));
      }
    );

    return () => unsubscribe();
  }, [isAdmin]);

  // Carregar solicitações de admin
  useEffect(() => {
    if (!isAdmin) {
      setAdminRequests([]);
      return;
    }

    const db = getFirestoreInstance();
    if (!db) return;

    const requestsQuery = query(
      collection(db, ADMIN_REQUESTS_COLLECTION),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(
      requestsQuery,
      (snapshot) => {
        const requests = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Partial<AdminRequest>;
          const status: AdminRequest['status'] =
            data.status === 'approved' || data.status === 'rejected' ? data.status : 'pending';
          return {
            id: docSnap.id,
            uid: data.uid ?? docSnap.id,
            email: data.email ?? '',
            name: data.name ?? '',
            status,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        });
        setAdminRequests(requests);
      },
      (err) => {
        setError(formatAuthError(err));
      }
    );

    return () => unsubscribe();
  }, [isAdmin]);

  const updateUser = useCallback(
    async (uid: string, updates: { name?: string; role?: UserRole; active?: boolean }) => {
      const db = getFirestoreInstance();
      if (!db) throw new Error('Firebase não está configurado');

      setLoading(true);
      setError(null);

      try {
        const userRef = doc(db, USERS_COLLECTION, uid);
        await updateDoc(userRef, {
          ...updates,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        const message = formatAuthError(err);
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateAdminRequest = useCallback(
    async (requestId: string, status: 'approved' | 'rejected') => {
      const db = getFirestoreInstance();
      if (!db) throw new Error('Firebase não está configurado');

      setLoading(true);
      setError(null);

      try {
        const requestRef = doc(db, ADMIN_REQUESTS_COLLECTION, requestId);
        await updateDoc(requestRef, {
          status,
          updatedAt: new Date().toISOString(),
        });

        // Se aprovado, atualizar role do usuário
        if (status === 'approved') {
          const request = adminRequests.find((r) => r.id === requestId);
          if (request) {
            const userRef = doc(db, USERS_COLLECTION, request.uid);
            await updateDoc(userRef, {
              role: 'admin',
              updatedAt: new Date().toISOString(),
            });
          }
        }
      } catch (err) {
        const message = formatAuthError(err);
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [adminRequests]
  );

  return {
    users,
    adminRequests,
    loading,
    error,
    updateUser,
    updateAdminRequest,
  };
};
