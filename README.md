# Libellus

PWA con React 19 + TypeScript + Vite 6, Tailwind v4 + shadcn/ui y Firebase (Auth, Firestore, Hosting).

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # rellenar con la config de Firebase
npm run dev
```

## Scripts

| Script | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | `tsc -b` (estricto) + build de producción con service worker |
| `npm run preview` | Sirve `dist/` (para probar la PWA instalable) |
| `npm run lint` | ESLint |
| `npm run generate-pwa-assets` | Regenera iconos PWA desde `public/logo.svg` |
| `npm run deploy` | Build + `firebase deploy` (Hosting y reglas de Firestore) |

## Firebase

1. Crear un proyecto en la [consola de Firebase](https://console.firebase.google.com) y añadir una app web.
2. Copiar su configuración a `.env.local` (ver `.env.example`).
3. Authentication → Sign-in method → habilitar **Google**.
4. Crear la base de datos de **Cloud Firestore**.
5. Poner el ID del proyecto en `.firebaserc`.
6. `npx firebase-tools login` y después `npm run deploy`.

Sin `.env.local` la app arranca con valores `demo-` y el login con Google no funciona.

## Estructura

```
src/
  components/ui/   componentes shadcn
  context/         estado global (Context API + listeners de Firebase)
  lib/             firebase.ts, utils.ts
  pages/           rutas (React Router)
firestore.rules    reglas de seguridad por roles (users/{uid}.role)
```
