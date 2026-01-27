/**
 * Validação de variáveis de ambiente no startup
 * Exibe avisos no console se variáveis importantes estiverem ausentes
 */

import { validateEnv, getEnvConfig } from './env';

/**
 * Valida e exibe avisos sobre variáveis de ambiente
 * Deve ser chamado no início da aplicação
 */
export const validateEnvironment = (): void => {
  const validation = validateEnv();
  const config = getEnvConfig();

  if (!validation.valid) {
    console.warn('⚠️ Variáveis de ambiente ausentes:');
    validation.errors.forEach((error) => console.warn(`  - ${error}`));
    console.warn('\nA aplicação pode não funcionar corretamente sem essas variáveis.\n');
  }

  // Avisos adicionais
  if (!config.geminiApiKey) {
    console.warn('⚠️ GEMINI_API_KEY não configurada. Funcionalidades de IA estarão desabilitadas.');
  }

  if (config.adminEmails.length === 0) {
    console.warn('⚠️ VITE_ADMIN_EMAILS não configurado. Nenhum usuário terá permissões de admin.');
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Ambiente de desenvolvimento');
    console.log(`📧 Domínio permitido: @${config.allowedEmailDomain}`);
    console.log(`👥 Admins configurados: ${config.adminEmails.length}`);
  }
};
