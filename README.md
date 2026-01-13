<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1RjGL6xAfQtkkJD-zhr57V1MYrOxLqjBC

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Autenticação (Firebase)

1. Crie um projeto no Firebase e ative **Auth → Email/Password**.
2. Crie um banco no **Firestore**.
3. Em **Auth → Settings → Authorized domains**, adicione seu domínio do GitHub Pages.
4. Crie um `.env.local` com as variáveis abaixo:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_ADMIN_EMAILS=admin@empresa.com
VITE_ALLOWED_EMAIL_DOMAIN=tjpr.jus.br
```

Notas:
- `VITE_ADMIN_EMAILS` aceita lista separada por vírgula.
- O admin envia **reset de senha por e-mail** para usuários.
- Cadastro é aberto; admins podem promover/rebaixar perfis no painel.
- Cada triagem registrada incrementa `triageCount` no perfil do usuário.
- Cadastro permitido apenas para contas `@tjpr.jus.br` (pode ajustar via `VITE_ALLOWED_EMAIL_DOMAIN`).
- No cadastro, o Firebase envia um aviso por e-mail (use o template de verificação do Auth).
- Login só é liberado após confirmação do e-mail.

Regras sugeridas (Firestore):

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    function isAllowedEmail() {
      return request.auth != null
        && request.auth.token.email.matches('.*@tjpr\\.jus\\.br$');
    }
    function isVerifiedEmail() {
      return request.auth != null && request.auth.token.email_verified == true;
    }
    function canAccess() {
      return isAllowedEmail() && isVerifiedEmail();
    }
    match /users/{userId} {
      allow read: if request.auth != null && canAccess() && (request.auth.uid == userId || isAdmin());
      allow create: if request.auth != null && request.auth.uid == userId && canAccess();
      allow update: if isAdmin()
        || (request.auth.uid == userId
          && canAccess()
          && request.resource.data.diff(resource.data).changedKeys().hasOnly(['name', 'triageCount', 'updatedAt']));
    }
  }
}
```

## Deploy to GitHub Pages

Build vai para `docs/` (Vite `base: './'`):

1. Build: `npm run build`
2. Publicar:
   - `npm run deploy:gh` (envia `docs/` para branch `gh-pages`)
   - ou `git subtree push --prefix docs origin gh-pages`
   - ou configure Pages para Source: `main` + folder `/docs`
   - ou habilite “GitHub Actions” (workflow `deploy.yml` já envia `docs/`)

Notes:
- `npm run build` gera `docs/404.html` (SPA fallback).
- `base: './'` garante assets em subpath `/repo-name/`.
