/**
 * Validação e acesso às variáveis de ambiente
 */

interface EnvConfig {
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
  adminEmails: string[];
  allowedEmailDomain: string;
  authActionUrl: string;
  authLinkDomain: string;
  authDynamicLinkDomain: string;
  geminiApiKey: string;
}

const getEnvVar = (key: string, defaultValue = ''): string => {
  return import.meta.env[key] ?? defaultValue;
};

const parseAdminEmails = (value: string): string[] => {
  if (!value) return [];
  return value
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
};

/**
 * Valida se as variáveis de ambiente obrigatórias estão presentes
 */
export const validateEnv = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const required = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_APP_ID',
  ];

  for (const key of required) {
    if (!getEnvVar(key)) {
      errors.push(`Variável de ambiente ausente: ${key}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Retorna a configuração de ambiente validada
 */
export const getEnvConfig = (): EnvConfig => {
  return {
    firebase: {
      apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
      authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
      projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
      storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
      messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
      appId: getEnvVar('VITE_FIREBASE_APP_ID'),
    },
    adminEmails: parseAdminEmails(getEnvVar('VITE_ADMIN_EMAILS')),
    allowedEmailDomain: getEnvVar('VITE_ALLOWED_EMAIL_DOMAIN', 'tjpr.jus.br').trim().toLowerCase(),
    authActionUrl: getEnvVar('VITE_AUTH_ACTION_URL', ''),
    authLinkDomain: getEnvVar('VITE_AUTH_LINK_DOMAIN', ''),
    authDynamicLinkDomain: getEnvVar('VITE_AUTH_DYNAMIC_LINK_DOMAIN', ''),
    geminiApiKey: getEnvVar('GEMINI_API_KEY'),
  };
};

/**
 * Verifica se o Firebase está habilitado
 */
export const isFirebaseEnabled = (): boolean => {
  const config = getEnvConfig();
  return Boolean(
    config.firebase.apiKey &&
      config.firebase.authDomain &&
      config.firebase.projectId &&
      config.firebase.appId
  );
};
