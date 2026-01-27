/**
 * Normaliza e-mail (trim + lowercase)
 */
export const normalizeEmail = (value: string): string => value.trim().toLowerCase();

/**
 * Sanitiza nome de arquivo removendo caracteres inválidos
 */
export const sanitizeFilename = (value: string): string =>
  value.trim().replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '_');
