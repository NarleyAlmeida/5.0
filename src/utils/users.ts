import type { UserProfile } from '../types';
import { normalizeEmail } from './string';

/**
 * Normaliza chave de usuário para deduplicação
 */
export const normalizeUserKey = (user: UserProfile): string => {
  const email = user.email ? normalizeEmail(user.email) : '';
  return email || user.uid;
};

/**
 * Obtém timestamp de uma string de data
 */
const getTimestamp = (value: string): number => {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

/**
 * Escolhe o usuário preferido entre dois duplicados
 */
export const pickPreferredUser = (current: UserProfile, candidate: UserProfile): UserProfile => {
  // Priorizar admin
  if (current.role !== candidate.role) {
    return candidate.role === 'admin' ? candidate : current;
  }
  // Priorizar ativo
  if (current.active !== candidate.active) {
    return candidate.active ? candidate : current;
  }
  // Priorizar mais recente
  const currentUpdated = getTimestamp(current.updatedAt);
  const candidateUpdated = getTimestamp(candidate.updatedAt);
  if (candidateUpdated !== currentUpdated) {
    return candidateUpdated > currentUpdated ? candidate : current;
  }
  // Priorizar com mais triagens
  const currentTriages = current.triageCount || 0;
  const candidateTriages = candidate.triageCount || 0;
  if (candidateTriages !== currentTriages) {
    return candidateTriages > currentTriages ? candidate : current;
  }
  return current;
};

/**
 * Remove usuários duplicados mantendo o preferido
 */
export const dedupeUsers = (users: UserProfile[]): UserProfile[] => {
  const map = new Map<string, UserProfile>();
  users.forEach((user) => {
    const key = normalizeUserKey(user);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, user);
      return;
    }
    map.set(key, pickPreferredUser(existing, user));
  });
  return Array.from(map.values());
};

/**
 * Obtém iniciais do nome do usuário
 */
export const getInitials = (name: string): string => {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};
