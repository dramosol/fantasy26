# Next Steps — Fantasy FIFA 2026

## 1. Prerrequisitos

- **Node.js ≥ 18** instalado y en el PATH
- Cuenta en [Resend](https://resend.com) (email gratuito hasta 3,000/mes)
- Cuenta en [Fly.io](https://fly.io) (para deploy, plan gratuito disponible)

---

## 2. Setup local (primera vez)

### 2.1 Instalar dependencias

Abre una terminal en `C:\Fantasy2026` y corre:

```bash
npm install
```

### 2.2 Configurar variables de entorno

```bash
copy .env.example .env
```

Edita `.env` y llena los valores:

| Variable | Descripción | Ejemplo |
|---|---|---|
| `ADMIN_USER` | Nombre de usuario del panel admin | `admin` |
| `ADMIN_PASS_HASH` | Hash bcrypt de tu contraseña (**ver paso 2.3**) | `$2b$10$...` |
| `SESSION_SECRET` | Cadena aleatoria larga para firmar sesiones | `cambiar-por-algo-largo-y-aleatorio` |
| `RESEND_API_KEY` | API key de Resend | `re_xxxxxxxxxxxx` |
| `FROM_EMAIL` | Email remitente verificado en Resend | `noreply@tudominio.com` |
| `APP_URL` | URL pública de la app (para links en correos) | `https://fantasy2026.fly.dev` |
| `DB_PATH` | Ruta del archivo SQLite (dejar vacío usa `data/fantasy2026.db`) | *(dejar vacío)* |

### 2.3 Generar hash de contraseña para el admin

```bash
node scripts/hash-password.js TU_CONTRASEÑA_AQUI
```

Copia el hash que imprime y pégalo como valor de `ADMIN_PASS_HASH` en `.env`.

### 2.4 Levantar en modo desarrollo

```bash
npm run dev
```

Abre el navegador en **http://localhost:3000**

- Panel admin: **http://localhost:3000/admin/login**

---

## 3. Flujo de uso del admin

1. Entra a `/admin/login` con tus credenciales
2. Ve a **Cargar tabla** (`/admin/paste`)
3. Copia el prompt LLM que aparece en la página
4. Pégalo en ChatGPT/Claude junto con una **captura de pantalla** de la tabla de Fantasy
5. Copia el JSON que devuelve el LLM
6. Pégalo en el textarea y elige el modo:
   - **Actualización en curso** — actualiza la tabla visible, sin email ni snapshot
   - **Cierre de jornada N** — guarda snapshot histórico + envía correo a suscriptores
7. Guarda

---

## 4. Deploy en Fly.io

### 4.1 Instalar Fly CLI

```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex
```

### 4.2 Login

```bash
fly auth login
```

### 4.3 Crear la app (solo primera vez)

```bash
# Desde C:\Fantasy2026
fly launch --no-deploy
```

Cuando pregunte, responde **No** a todas las opciones de sobreescribir (ya tienes `fly.toml`).

### 4.4 Crear volumen persistente para SQLite

```bash
fly volumes create fantasy2026_data --region mia --size 1
```

### 4.5 Configurar secrets

```bash
fly secrets set \
  ADMIN_USER="admin" \
  ADMIN_PASS_HASH="$2b$10$EL_HASH_GENERADO_EN_PASO_2.3" \
  SESSION_SECRET="una-cadena-aleatoria-muy-larga" \
  RESEND_API_KEY="re_xxxxxxxxxxxx" \
  FROM_EMAIL="noreply@tudominio.com" \
  APP_URL="https://fantasy2026.fly.dev"
```

### 4.6 Deploy

```bash
fly deploy
```

### 4.7 Verificar

```bash
fly status
fly logs
```

La app queda en: `https://fantasy2026.fly.dev`

---

## 5. Actualizaciones futuras

Para redesplegar después de cambios en el código:

```bash
fly deploy
```

---

## 6. Notas importantes

- La base de datos SQLite vive en el volumen `/data/fantasy2026.db` en Fly.io — persiste entre deploys.
- Si cambias la contraseña del admin, corre `node scripts/hash-password.js NUEVA_PASS` y actualiza `fly secrets set ADMIN_PASS_HASH="..."` + `fly deploy`.
- Los suscriptores pueden darse de baja desde el link en el correo o desde `/baja/<token>`.
- Las noticias RSS se cachean 30 minutos. Puedes refrescar manualmente desde `/admin/news`.
