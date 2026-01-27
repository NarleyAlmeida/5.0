<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# TRIARIO - Sistema de Triagem Recursal

Sistema de triagem recursal para análise de admissibilidade de recursos (Especial e Extraordinário) no contexto do TJPR.

## Rodar no Git (desenvolvimento local)

**Pré-requisitos:** Node.js 18+

1. **Clone o repositório**
   ```bash
   git clone <url-do-repositorio>
   cd triario-repo
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure o ambiente**
   - Copie o exemplo de variáveis: `cp .env.example .env.local`
   - Edite `.env.local` e preencha as chaves do Firebase (e demais vars se precisar).  
   - **Nunca** commite `.env.local` (já está no `.gitignore`).

4. **Suba o servidor de desenvolvimento**
   ```bash
   npm run dev
   ```
   Acesse em geral em `http://localhost:3000`.

### Scripts disponíveis

| Comando          | Descrição                          |
|------------------|------------------------------------|
| `npm run dev`    | Servidor de desenvolvimento        |
| `npm run build`  | Build de produção (saída em `docs/`) |
| `npm run preview`| Preview do build local             |
| `npm run test`   | Verificação de tipos (`tsc --noEmit`) |
| `npm run deploy:gh` | Build + publicação em GitHub Pages (branch `gh-pages`) |

---

## Estrutura do projeto

```
src/
├── config/      # Configurações (Firebase, env, constantes)
├── types/       # Definições TypeScript
├── utils/       # Utilitários (date, currency, storage, calculations, validation)
├── hooks/       # React hooks (useAuth, useProfile, useAdmin)
├── services/    # Serviços (authService)
```

**Documentação adicional:**
- [MELHORIAS.md](./MELHORIAS.md) – Melhorias gerais na estrutura
- [MELHORIAS_USUARIOS.md](./MELHORIAS_USUARIOS.md) – Melhorias no sistema de usuários
- [AGENTS.md](./AGENTS.md) – Orientações para contribuição no repositório

---

## Autenticação (Firebase)

1. Crie um projeto no [Firebase](https://console.firebase.google.com) e ative **Auth → Sign-in method → Email/Password**.
2. Crie um banco **Firestore** no mesmo projeto.
3. Em **Auth → Settings → Authorized domains**, adicione seu domínio (ex.: `usuario.github.io` para GitHub Pages).
4. Use o [.env.example](./.env.example) como base e preencha em `.env.local`:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_ADMIN_EMAILS=admin@empresa.com
VITE_ALLOWED_EMAIL_DOMAIN=tjpr.jus.br
VITE_AUTH_ACTION_URL=https://seu-dominio.com
VITE_AUTH_LINK_DOMAIN=auth.seu-dominio.com
VITE_AUTH_DYNAMIC_LINK_DOMAIN=seu-dominio.page.link
```

**Notas:**
- `VITE_ADMIN_EMAILS` aceita vários e-mails separados por vírgula.
- Cadastro permitido apenas para o domínio definido em `VITE_ALLOWED_EMAIL_DOMAIN` (ex.: `@tjpr.jus.br`).
- Login liberado somente após confirmação de e-mail pelo Firebase.
- `VITE_AUTH_ACTION_URL` e `VITE_AUTH_LINK_DOMAIN` devem usar domínios autorizados no Firebase Auth.

As **regras sugeridas** do Firestore estão no arquivo [firestore.rules](./firestore.rules) do repositório.

---

## Deploy no GitHub Pages

O build é gerado em `docs/` (Vite com `base: './'`).

### Via GitHub Actions (recomendado)

1. Em **Settings → Secrets and variables → Actions**, crie os secrets:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_ADMIN_EMAILS`
   - `VITE_ALLOWED_EMAIL_DOMAIN`

2. Em **Settings → Pages**, use “GitHub Actions” como source. O workflow [.github/workflows/deploy.yml](./.github/workflows/deploy.yml) faz o build e publica a pasta `docs/`.

3. No Firebase, em **Auth → Authorized domains**, adicione o domínio do Pages (ex.: `usuario.github.io`).

### Outras opções

- **Manual:** `npm run build` e depois `npm run deploy:gh` (publica a pasta `docs/` na branch `gh-pages`).
- Ou configurar Pages com source = branch `main` e pasta `/docs` (commitando o conteúdo de `docs/` depois do build local).

---

## Licença e créditos

Desenvolvido no contexto do TJPR – Assessoria de Recursos aos Tribunais Superiores (STF e STJ).
