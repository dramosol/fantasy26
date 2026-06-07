# Fantasy FIFA 2026 - Torneo Privado

Web app para trackear el Fantasy Football del torneo local.

## Stack
- Node.js + Express + EJS + SQLite (better-sqlite3)
- Email via Resend | RSS via rss-parser
- Deploy: Fly.io (SQLite en volumen persistente)

## Setup local

```bash
npm install
cp .env.example .env   # edita con tus valores
node scripts/hash-password.js tu_password  # genera ADMIN_PASS_HASH
npm run dev
```

## Variables de entorno (.env)

| Variable | Descripcion |
|---|---|
| ADMIN_USER | Nombre de usuario admin (default: admin) |
| ADMIN_PASS_HASH | Hash bcrypt de la contrasena admin |
| SESSION_SECRET | Secreto para sesiones (aleatorio largo) |
| COOKIE_SECRET | Secreto para cookies (aleatorio largo) |
| RESEND_API_KEY | API key de Resend para envio de correos |
| FROM_EMAIL | Email remitente (debe ser dominio verificado en Resend) |
| APP_URL | URL publica de la app (ej: https://fantasy2026.fly.dev) |
| DB_PATH | Ruta del archivo SQLite (default: data/fantasy2026.db) |

## Deploy en Fly.io

```bash
fly auth login
fly launch --no-deploy  # usa el fly.toml existente
fly volumes create fantasy2026_data --region mia --size 1
fly secrets set ADMIN_USER=admin ADMIN_PASS_HASH="..." SESSION_SECRET="..." RESEND_API_KEY="..." FROM_EMAIL="..." APP_URL="https://TU_APP.fly.dev"
fly deploy
```

## Flujo del admin

1. Entra a `/admin/login`
2. Ve a `/admin/paste`
3. Copia el prompt LLM, pegalo en tu IA con la captura de pantalla
4. Copia el JSON resultante y pegalo en el textarea
5. Elige modo: "Actualizacion en curso" o "Cierre de jornada N"
6. Guarda

Ver tambien: `PROMPT_LLM.md` para el prompt completo.
