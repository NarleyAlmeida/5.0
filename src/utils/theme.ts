import type { ThemeMode } from '../types';

/**
 * Parse de tema (valida e retorna tema válido)
 */
export const parseTheme = (value?: string): ThemeMode => {
  if (value === 'dark' || value === 'light' || value === 'system') return value;
  return 'system';
};
