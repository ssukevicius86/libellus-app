# tw-to-css

Script que convierte las clases de Tailwind de una página a **CSS puro**.

Toma `src/pages/<Página>/<Página>.tsx`, genera `src/pages/<Página>/<Página>.css` con el CSS equivalente y reemplaza las utilidades de Tailwind del `.tsx` por clases normales.

```tsx
// Antes
<div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">

// Después
<div className="library-div-9">
```

```css
/* Library.css */
.library-div-9 {
  column-gap: 1rem;
  row-gap: 1.5rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  display: grid;
}

@media (min-width: 40rem) {
  .library-div-9 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 64rem) {
  .library-div-9 {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}
```

## Uso

```bash
npm run tw-to-css -- Library              # una página
npm run tw-to-css -- Mood Login           # varias
npm run tw-to-css -- --all                # todas las carpetas de src/pages
npm run tw-to-css -- Library --dry        # solo muestra el resultado, no escribe nada
```

El nombre de la página es el de su carpeta (y archivo): `Library`, `BookDetail`, `ReadingSession`…

> [!IMPORTANT]
> El script **sobrescribe** el `.tsx` y el `.css` de la página. Haz un commit antes de ejecutarlo para poder volver atrás con `git checkout`.

Flujo recomendado:

1. `git commit` del estado actual.
2. `npm run tw-to-css -- <Página> --dry` y revisa el CSS que mostraría.
3. `npm run tw-to-css -- <Página>`.
4. `npm run build` para comprobar que compila.
5. `npm run dev` y revisa la página: modo claro y oscuro, móvil y escritorio, estados `hover`.
6. Renombra las clases generadas por nombres con significado (ver [Nombres de las clases](#nombres-de-las-clases)).

## Qué hace, paso a paso

1. **Lee el `.tsx`** y busca todos los atributos `className`:
   - `className="..."`
   - los strings dentro de `cn(...)` / `clsx(...)`, ternarios y `&&`:
     ```tsx
     className={cn(
       'rounded-full border px-4',           // → una clase
       active ? 'text-gold' : 'opacity-60',  // → una clase por cada string
     )}
     ```
2. **Separa las clases de cada string** en tres grupos:
   - **Clases propias** del proyecto (las definidas en `src/index.css`, como `deco-card` o `deco-eyebrow`, y las que ya existan en el `.css` de la página) → se conservan tal cual.
   - **Utilidades de Tailwind** válidas → se convierten.
   - **Desconocidas** (ni propias ni de Tailwind) → se conservan y se avisan en consola.
3. **Crea una clase nueva** por cada combinación distinta de utilidades. Si dos elementos usan exactamente las mismas utilidades, comparten clase.
4. **Genera el CSS con el propio compilador de Tailwind** (`@apply` + el tema de `src/index.css`). Así el resultado es exactamente lo que Tailwind produciría: colores del proyecto, breakpoints, variantes `hover:`, `dark:`, etc.
5. **Limpia el CSS** para que sea legible y no dependa de Tailwind:
   - valores del tema resueltos: `1.25rem` en vez de `calc(var(--spacing) * 5)`;
   - variables internas `--tw-*` sustituidas por su valor cuando se puede;
   - `calc()` simples resueltos: `calc(1 / 2 * 100%) * -1` → `-50%`;
   - sin fallbacks de `color-mix`, sombras vacías de `ring` ni selectores combinados (`.a, .b`);
   - reglas contiguas del mismo selector unidas y declaraciones repetidas eliminadas.
6. **Escribe los archivos**:
   - `<Página>.css`: si no existe se crea; si existe (por ejemplo, con estilos escritos a mano), las reglas nuevas se agregan al final.
   - `<Página>.tsx`: reemplaza las clases y agrega `import './<Página>.css'` después del último import si no estaba.
7. **Muestra un resumen** en consola: las clases generadas y de qué utilidades salen, y los avisos.

## Nombres de las clases

El script no puede saber qué representa cada elemento, así que genera nombres con el formato:

```
<página>-<etiqueta>-<número>
```

| Parte | Origen | Ejemplo |
|---|---|---|
| página | nombre de la página en kebab-case | `ReadingSession` → `reading-session` |
| etiqueta | elemento JSX, en minúsculas | `div`, `p`, `button`, `tabstrigger` |
| número | contador de la página | `1`, `2`, `3`… |

Ejemplo: `.reading-session-button-27`.

Se recomienda renombrarlos a algo con significado (`.reading-session-cover-option`). Hay que cambiar el nombre **en los dos archivos**, el `.css` y el `.tsx`. En VS Code, Ctrl+Shift+H (buscar y reemplazar en archivos) lo hace de una vez.

> [!TIP]
> Todas las clases llevan el nombre de la página como prefijo. Los `.css` importados en Vite son globales, así que el prefijo evita choques entre páginas.

## Ejecutarlo más de una vez

Es seguro: las clases que ya tienen CSS en el `.css` de la página cuentan como propias, así que una página ya convertida se queda igual:

```
● Library (src\pages\Library\Library.tsx)
  Sin utilidades de Tailwind: nada que convertir.
```

Si después agregas utilidades de Tailwind nuevas a una página ya convertida, al volver a ejecutarlo solo se convierten esas, y sus reglas se agregan al final del `.css`.

## Avisos que puede mostrar

| Aviso | Qué significa | Qué hacer |
|---|---|---|
| `clases desconocidas (se dejan igual): …` | Clases que no son de Tailwind ni están definidas en el CSS del proyecto | Normalmente son erratas o clases que sobran. Revísalas a mano. |
| `línea N: className con template literal ${…}` | Clases armadas con interpolación, por ejemplo `` `p-4 ${extra}` `` | El script no puede convertirlas. Pásalas a `cn()` o conviértelas a mano. |

## Limitaciones

- **Solo convierte lo escrito en la página.** Los componentes (`Button`, `BookRow`, `PageHeader`, `src/components/ui/*`) siguen usando Tailwind por dentro.
- **Tailwind sigue siendo necesario** en el proyecto para esos componentes. El CSS generado sí es independiente: no usa variables de tema de Tailwind, solo las del proyecto (`--gold`, `--card`, `--muted-foreground`…).
- **El orden de las propiedades** dentro de cada regla puede no coincidir con el orden de las utilidades (por ejemplo, `display: flex` al final). El resultado es el mismo.
- **`className` en componentes de shadcn/ui:** antes, `tailwind-merge` resolvía conflictos entre las clases del componente y las de la página. Ahora gana el CSS de la página, porque está fuera de las capas (`@layer`) de Tailwind. En la práctica el resultado es el mismo que antes.
- **Animaciones:** utilidades como `animate-spin` generan su propio `@keyframes` en el `.css` de cada página que las use.
- Strings con interpolación y clases construidas con otras funciones que no sean `cn()`/`clsx()` se ignoran.

## Dependencias

Todas son `devDependencies` del proyecto:

| Paquete | Para qué |
|---|---|
| `@babel/parser`, `@babel/traverse` | Leer el `.tsx` y encontrar los `className` |
| `magic-string` | Reemplazar texto en el `.tsx` sin tocar el resto del formato |
| `@tailwindcss/node` | Compilar las utilidades con el tema del proyecto y optimizar el CSS (lightningcss) |
| `postcss` | Limpiar y reorganizar el CSS generado |

## Configuración

Al principio de [`tw-to-css.mjs`](tw-to-css.mjs):

| Constante | Valor | Uso |
|---|---|---|
| `CLASS_HELPERS` | `cn`, `clsx` | Funciones cuyos argumentos string se tratan como clases |
| `MARKERS` | `group`, `peer` | Clases de Tailwind sin CSS propio que se conservan porque las usan variantes como `group-hover:` |
| `TW_PRELUDE` | `@import "tailwindcss/theme" theme(inline)` + `src/index.css` | Tema con el que se compila; incluye colores, fuentes y `dark:` del proyecto |
