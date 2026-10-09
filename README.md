# Libellus

Santuario digital de lectura: registro de libros y lecturas con una experiencia sensorial
(microambientes sonoros, Focus Timer con atenuación de brillo y registro del ánimo).

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

## Páginas

| Ruta | Página |
| --- | --- |
| `/login` | Acceso con Google |
| `/` | Santuario: libros en curso, racha, minutos de la semana y ánimo de hoy |
| `/biblioteca` | Estantes Leyendo / Quiero leer / Leídos con buscador |
| `/biblioteca/agregar` | Búsqueda en Google Books o carga manual |
| `/libro/:id` | Progreso, valoración, notas, sesiones y borrado |
| `/sesion` | Focus Timer, microambientes, atenuación, ánimo antes/después |
| `/animo` | Check-in diario y gráficos de ánimo y minutos (30 días) |
| `/ajustes` | Tema noche/día, timer y atenuación por defecto, volumen, salir |

Los sonidos (lluvia, piano, bosque) se generan con la Web Audio API en `src/lib/ambience/`:
no hay archivos de audio y funcionan offline.

## Estructura

```
src/
  components/ui/   componentes shadcn
  components/      layout, libros, ambientes, ánimo, gráficos y piezas art déco
  context/         Auth, Preferences (tema/timer, localStorage) y Ambience (motor de audio)
  hooks/           listeners de Firestore (useFirestore, useLibrary) y Wake Lock
  lib/             firebase, books, sessions, moods, googleBooks, stats, ambience/
  pages/           rutas (React Router, secundarias con lazy())
firestore.rules    users/{uid} por roles + subcolecciones books, sessions y moods solo del dueño
```
