/**
 * Utilitários de validação para usuários
 */

/**
 * Valida formato de email
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Valida força da senha
 */
export const validatePassword = (password: string): { valid: boolean; message: string } => {
  if (password.length < 6) {
    return { valid: false, message: 'Senha deve ter pelo menos 6 caracteres' };
  }
  if (password.length > 128) {
    return { valid: false, message: 'Senha muito longa (máximo 128 caracteres)' };
  }
  return { valid: true, message: '' };
};

/**
 * Valida confirmação de senha
 */
export const validatePasswordConfirm = (
  password: string,
  confirm: string
): { valid: boolean; message: string } => {
  if (password !== confirm) {
    return { valid: false, message: 'As senhas não coincidem' };
  }
  return { valid: true, message: '' };
};

/**
 * Valida nome de usuário
 */
export const validateName = (name: string): { valid: boolean; message: string } => {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { valid: false, message: 'Nome deve ter pelo menos 2 caracteres' };
  }
  if (trimmed.length > 100) {
    return { valid: false, message: 'Nome muito longo (máximo 100 caracteres)' };
  }
  return { valid: true, message: '' };
};

/**
 * Valida email completo (formato + domínio permitido)
 */
export const validateEmailForRegistration = (
  email: string,
  allowedDomain: string
): { valid: boolean; message: string } => {
  if (!isValidEmail(email)) {
    return { valid: false, message: 'E-mail inválido' };
  }
  const normalized = email.trim().toLowerCase();
  if (!normalized.endsWith(`@${allowedDomain}`)) {
    return { valid: false, message: `Acesso restrito a contas @${allowedDomain}` };
  }
  return { valid: true, message: '' };
};
