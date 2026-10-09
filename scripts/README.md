# tw-to-css

Script que convierte las clases de Tailwind de una **página** o de un **componente ui** a **CSS puro**, usando las variables y las clases compartidas del proyecto.

Para los componentes de `src/components/ui/` hay detalles propios: ver [Componentes ui](#componentes-ui).

Toma `src/pages/<Página>/<Página>.tsx`, genera `src/pages/<Página>/<Página>.css` con el CSS equivalente y reemplaza las utilidades de Tailwind del `.tsx` por clases normales.

```tsx
// Antes
<div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
<p className="font-serif text-lg italic text-muted-foreground">Ningún libro…</p>

// Después
<div className="library-div-9">
<p className="texto-vacio">Ningún libro…</p>
```

```css
/* Library.css */
.library-div-9 {
  column-gap: var(--espacio-4);
  row-gap: var(--espacio-6);
  grid-template-columns: repeat(2, minmax(0, 1fr));
  display: grid;
}

@media (min-width: 40rem) {
  .library-div-9 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

/* .texto-vacio no se genera: ya existe en src/styles/compartidos.css */
```

## Uso

```bash
npm run tw-to-css -- Library              # una página
npm run tw-to-css -- Mood Login           # varias
npm run tw-to-css -- --all                # todas las carpetas de src/pages
npm run tw-to-css -- Library --dry        # solo muestra el resultado, no escribe nada

npm run tw-to-css:ui -- button            # un componente de src/components/ui
npm run tw-to-css:ui -- --all             # todos los componentes ui
npm run tw-to-css:ui -- dialog --dry
```

El nombre es el de su carpeta (y archivo): `Library`, `BookDetail`… para páginas; `button`, `dialog`… para componentes.

> [!IMPORTANT]
> El script **sobrescribe** el `.tsx` y el `.css` de la página. Haz un commit antes de ejecutarlo para poder volver atrás con `git checkout`.

Flujo recomendado:

1. `git commit` del estado actual.
2. `npm run tw-to-css -- <Página> --dry` y revisa el CSS que mostraría.
3. `npm run tw-to-css -- <Página>`.
4. `npm run build` para comprobar que compila.
5. `npm run dev` y revisa la página: modo claro y oscuro, móvil y escritorio, estados `hover`.
6. Renombra las clases generadas por nombres con significado (ver [Nombres de las clases](#nombres-de-las-clases)).

## Archivos que usa

| Archivo | Qué contiene | Qué hace el script con él |
|---|---|---|
| [`src/styles/variables.css`](../src/styles/variables.css) | Paleta, tipografía, espaciado, tamaños, bordes, transiciones | Cambia valores sueltos por `var(--…)` |
| [`src/styles/compartidos.css`](../src/styles/compartidos.css) | Clases que se repiten entre páginas (`.texto-secundario`, `.chip`…) | Si una clase de la página es idéntica a una de estas, usa la compartida |
| [`src/index.css`](../src/index.css) | Tema de Tailwind y clases `deco-*` | Compila con ese tema; las clases definidas ahí se conservan |

Los tres se importan desde `src/index.css`, así que están disponibles en toda la app.

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
   - **Clases propias** del proyecto (definidas en `src/index.css`, `src/styles/compartidos.css` o en el `.css` de la página) → se conservan tal cual.
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
6. **Aplica las variables** de `variables.css` sobre **todo** el `.css` de la página (también lo escrito a mano). Ver [Variables](#variables).
7. **Aplica las clases compartidas** de `compartidos.css`. Ver [Clases compartidas](#clases-compartidas).
8. **Escribe los archivos**:
   - `<Página>.css`: si no existe se crea; si existe, las reglas nuevas se agregan al final.
   - `<Página>.tsx`: reemplaza las clases y agrega `import './<Página>.css'` después del último import si no estaba.
9. **Muestra un resumen** en consola: clases generadas, valores cambiados por variables, clases sustituidas por compartidas y avisos.

## Variables

El script lee `src/styles/variables.css` y cambia un valor por su variable **solo si coincide exactamente**. Lo que no coincide queda como estaba.

| Propiedad | Variables | Ejemplo |
|---|---|---|
| `font-size` | `--texto-xs` … `--texto-5xl` | `0.875rem` → `var(--texto-sm)` |
| `line-height` | `--texto-*-interlineado` del tamaño de la misma regla; si no, `--interlineado-*` | `1.4286` junto a `--texto-sm` → `var(--texto-sm-interlineado)` |
| `gap`, `padding*`, `margin*`, `inset`, `top/left/…` | `--espacio-*` | `1rem` → `var(--espacio-4)` · `-0.5rem` → `calc(var(--espacio-2) * -1)` |
| `width` + `height` iguales | `--icono-*` | `1rem` / `1rem` → `var(--icono-sm)` |
| `max-width` | `--contenedor-*` | `28rem` → `var(--contenedor-md)` |
| `border-radius` | `--radio-*` | `9999px` → `var(--radio-pildora)` |
| `font-weight` | `--peso-*` | `500` → `var(--peso-medio)` |
| `font-family` | `--fuente-*` | `"Cormorant Garamond", …` → `var(--fuente-serif)` |
| `transition-duration` / `-timing-function` | `--transicion-*` | `.15s` → `var(--transicion-duracion)` |
| cualquier `color-mix(…)` | colores derivados | `color-mix(… var(--gold) 10% …)` → `var(--dorado-suave)` |

Además:
- quita las `--tw-gradient-*` de `transition-property`;
- cambia `animation: spin …` por `girar` (la animación de `compartidos.css`).

Las medidas que solo usa un elemento (el ancho de una portada, una altura concreta) quedan literales a propósito: no tiene sentido una variable para un único uso.

> [!TIP]
> **Para agregar una variable nueva**, escríbela en `variables.css` con uno de los prefijos de la tabla (`--espacio-12: 3rem;`) y ejecuta `npm run tw-to-css -- --all`: se aplicará en todas las páginas.

## Clases compartidas

Si **todos** los estilos de una clase de la página (incluidos `@media`, `:hover`, `:where(…)`) son idénticos a los de una clase de `compartidos.css`:
1. se borra la clase de la página;
2. en el `.tsx` se usa la compartida en su lugar.

```
● Library (src\pages\Library\Library.tsx)
    .library-p-11  →  .texto-vacio (compartida)
```

Los `@keyframes` que ya existen en `compartidos.css` también se borran de la página.

> [!TIP]
> **Para crear una clase compartida nueva**, agrégala a `compartidos.css` escribiendo los valores **con las variables** (`font-size: var(--texto-sm)`, no `0.875rem`), y ejecuta `npm run tw-to-css -- --all`. Todas las clases idénticas de las páginas pasarán a usarla.

Las clases compartidas se cargan antes que el CSS de las páginas. Si un elemento combina una clase de la página con una compartida y las dos definen la misma propiedad, gana la de la página.

## Componentes ui

`npm run tw-to-css:ui` hace lo mismo que con las páginas, sobre `src/components/ui/<nombre>/<nombre>.tsx`, con estas diferencias.

### Nombres con significado

Los componentes de shadcn ya dicen qué es cada elemento, así que los nombres salen solos:

| Origen | Nombre | Ejemplo |
|---|---|---|
| Atributo `data-slot` del elemento | `ui-<slot>` | `<div data-slot="dialog-content">` → `.ui-dialog-content` |
| Base de `cva()` | `ui-<variable sin "Variants">` | `buttonVariants` → `.ui-button` |
| Cada variante de `cva()` | `ui-<base>--<grupo>-<opción>` | `variant: { outline }` → `.ui-button--variant-outline` |
| Elemento sin `data-slot` | `ui-<componente>-<etiqueta>-<n>` | `.ui-dialog-span-1` |

```tsx
// Antes
const buttonVariants = cva("inline-flex … rounded-md …", {
  variants: { variant: { outline: "border bg-background …" } },
})

// Después
const buttonVariants = cva("ui-button", {
  variants: { variant: { outline: "ui-button--variant-outline" } },
})
```

`cva()` sigue funcionando igual: elige qué clases poner según las props (`<Button variant="outline">`).

### El CSS va en `@layer components`

```css
@layer theme, base, components, utilities;

@layer components {
  .ui-button { … }
}
```

Muchos sitios le pasan clases al componente por `className` (`<Button className="w-full">`). Antes, `tailwind-merge` hacía que esas clases ganaran a las del componente. Ahora lo resuelven las capas de CSS:

| Origen de la clase | Capa | Gana sobre |
|---|---|---|
| Componente ui (`.ui-button`) | `components` | — |
| Utilidad de Tailwind en otro componente (`w-full`) | `utilities` | el componente ui |
| CSS de una página (`.library-input-7`) o compartido | sin capa | todo lo anterior |

La primera línea (`@layer theme, base, components, utilities;`) fija ese orden aunque el CSS del componente se cargue antes que el de Tailwind.

### Lo que no se hace en ui

- **No se aplican las clases compartidas.** Están fuera de las capas, así que cambiarían qué estilo gana.
- **Las variantes de `cva()` no se fusionan**, aunque dos tengan los mismos estilos. Cada opción tiene su propia clase.

### Después de `npx shadcn add`

shadcn crea el componente suelto en `src/components/ui/<nombre>.tsx` y con Tailwind:

1. Muévelo a su carpeta: `src/components/ui/<nombre>/<nombre>.tsx`.
2. Actualiza sus imports a `@/components/ui/<nombre>/<nombre>`.
3. `npm run tw-to-css:ui -- <nombre>`.

## Nombres de las clases

En las páginas, el script no puede saber qué representa cada elemento, así que genera nombres con el formato:

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

Es seguro. Una página ya convertida, con las variables y las compartidas al día, se queda igual:

```
● Library (src\pages\Library\Library.tsx)
  Sin utilidades de Tailwind.
  Nada que cambiar.
```

Conviene ejecutar `npm run tw-to-css -- --all` cada vez que:
- agregues utilidades de Tailwind a una página ya convertida (solo se convierten esas);
- agregues variables a `variables.css` o clases a `compartidos.css`.

## Avisos que puede mostrar

| Aviso | Qué significa | Qué hacer |
|---|---|---|
| `clases desconocidas (se dejan igual): …` | Clases que no son de Tailwind ni están definidas en el CSS del proyecto | Normalmente son erratas o clases que sobran. Revísalas a mano. |
| `línea N: className con template literal ${…}` | Clases armadas con interpolación, por ejemplo `` `p-4 ${extra}` `` | El script no puede convertirlas. Pásalas a `cn()` o conviértelas a mano. |

## Limitaciones

- **Solo convierte lo escrito en la página.** Los componentes (`Button`, `BookRow`, `PageHeader`, `src/components/ui/*`) siguen usando Tailwind por dentro.
- **Tailwind sigue siendo necesario** en el proyecto para esos componentes. El CSS generado sí es independiente: solo usa variables del proyecto.
- **Las variables no funcionan dentro de `@media`**, así que los breakpoints (`40rem`, `64rem`) se escriben a mano. Están documentados al principio de `variables.css`.
- **El orden de las propiedades** dentro de cada regla puede no coincidir con el orden de las utilidades (por ejemplo, `display: flex` al final). El resultado es el mismo.
- **Las clases compartidas se detectan solo si son idénticas.** Una clase con un estilo de más o de menos no se sustituye.
- **`className` en componentes de shadcn/ui:** antes, `tailwind-merge` resolvía conflictos entre las clases del componente y las de la página. Ahora gana el CSS de la página, porque está fuera de las capas (`@layer`) de Tailwind.
- Strings con interpolación y clases construidas con otras funciones que no sean `cn()`/`clsx()` se ignoran.

## Dependencias

Todas son `devDependencies` del proyecto:

| Paquete | Para qué |
|---|---|
| `@babel/parser`, `@babel/traverse` | Leer el `.tsx` y encontrar los `className` |
| `magic-string` | Reemplazar texto en el `.tsx` sin tocar el resto del formato |
| `@tailwindcss/node` | Compilar las utilidades con el tema del proyecto y optimizar el CSS (lightningcss) |
| `postcss` | Limpiar el CSS, aplicar variables y comparar clases |

## Configuración

Al principio de [`tw-to-css.mjs`](tw-to-css.mjs):

| Constante | Valor | Uso |
|---|---|---|
| `VARIABLES_CSS` | `src/styles/variables.css` | De dónde lee las variables |
| `SHARED_CSS` | `src/styles/compartidos.css` | De dónde lee las clases compartidas |
| `CLASS_HELPERS` | `cn`, `clsx` | Funciones cuyos argumentos string se tratan como clases |
| `isMarker` | `group`, `group/tabs`, `peer`… | Clases de Tailwind sin CSS propio que se conservan porque las usan variantes como `group-hover:` |
| `LAYER_ORDER` | `@layer theme, base, components, utilities;` | Orden de capas que se escribe al principio del CSS de cada componente ui |
| `KEYFRAMES_ALIAS` | `spin → girar` | Animaciones de Tailwind que tienen su versión en `compartidos.css` |
| `SPACING_PROP` | `gap`, `padding*`, `margin*`… | Propiedades que usan la escala `--espacio-*` |
| `TW_PRELUDE` | `@import "tailwindcss/theme" theme(inline)` + `src/index.css` | Tema con el que se compila; incluye colores, fuentes y `dark:` del proyecto |
