#!/usr/bin/env node
/**
 * Convierte las clases de Tailwind de una página o de un componente ui a CSS puro.
 *
 *   node scripts/tw-to-css.mjs <Page> [<Page>…] [--dry]
 *   node scripts/tw-to-css.mjs --all [--dry]
 *   node scripts/tw-to-css.mjs --ui <componente> [<componente>…] [--dry]
 *   node scripts/tw-to-css.mjs --ui --all [--dry]
 *
 * Páginas (src/pages/<Page>/<Page>.tsx): cada `className` pasa a una clase
 * `<page>-<etiqueta>-<n>` en <Page>.css.
 *
 * Componentes (src/components/ui/<nombre>/<nombre>.tsx): las clases se nombran
 * por su `data-slot` (`ui-dialog-content`) y las variantes de cva() por su
 * variante (`ui-button--variant-outline`). El CSS va en @layer components para
 * que las utilidades de Tailwind que reciban por className sigan ganando.
 *
 * Después, sobre todo el .css (también si ya estaba convertido):
 * - usa las variables de src/styles/variables.css en lugar de valores sueltos;
 * - (solo páginas) sustituye las clases idénticas a una de src/styles/compartidos.css.
 */
import fs from 'node:fs'
import path from 'node:path'
import { parse } from '@babel/parser'
import _traverse from '@babel/traverse'
import MagicString from 'magic-string'
import postcss from 'postcss'
import { compile, optimize, __unstable__loadDesignSystem } from '@tailwindcss/node'

const traverse = _traverse.default ?? _traverse

const ROOT = path.resolve(import.meta.dirname, '..')
const SRC = path.join(ROOT, 'src')
const PAGES = path.join(SRC, 'pages')
const UI = path.join(SRC, 'components', 'ui')
const GLOBAL_CSS = path.join(SRC, 'index.css')
const VARIABLES_CSS = path.join(SRC, 'styles', 'variables.css')
const SHARED_CSS = path.join(SRC, 'styles', 'compartidos.css')

// Funciones que combinan clases: sus argumentos string se convierten.
const CLASS_HELPERS = new Set(['cn', 'clsx'])
// Marcadores de Tailwind que no generan CSS pero los usan otras utilidades
// (group-hover:…, group-data-[…]/tabs:…), con o sin nombre: group, group/tabs, peer.
const isMarker = (t) => /^(group|peer)(\/[\w-]+)?$/.test(t)
// Orden de capas de Tailwind; se repite en el CSS de ui por si se carga antes que index.css
const LAYER_ORDER = '@layer theme, base, components, utilities;'
// Animaciones de Tailwind que tienen su versión en compartidos.css
const KEYFRAMES_ALIAS = { spin: 'girar' }
// Propiedades que usan la escala --espacio-*
const SPACING_PROP = /^(gap|row-gap|column-gap|padding(-[\w-]+)?|margin(-[\w-]+)?|inset(-[\w-]+)?|top|right|bottom|left)$/

const TW_PRELUDE = `@import "tailwindcss/theme" theme(inline);\n@import "./index.css" reference;\n`

// ---------------------------------------------------------------------------
// CLI

const args = process.argv.slice(2)
const dry = args.includes('--dry')
const ui = args.includes('--ui')
const dir = ui ? UI : PAGES
const names = args.includes('--all')
  ? fs.readdirSync(dir).filter((d) => fs.existsSync(path.join(dir, d, `${d}.tsx`)))
  : args.filter((a) => !a.startsWith('--'))

if (!names.length) {
  console.log(`Uso:
  node scripts/tw-to-css.mjs <Page> [<Page>…] [--dry]        páginas
  node scripts/tw-to-css.mjs --all [--dry]
  node scripts/tw-to-css.mjs --ui <nombre> [<nombre>…] [--dry]  componentes de src/components/ui
  node scripts/tw-to-css.mjs --ui --all [--dry]`)
  process.exit(1)
}

const design = await __unstable__loadDesignSystem(TW_PRELUDE, { base: SRC })
const sharedCssSource = fs.existsSync(SHARED_CSS) ? fs.readFileSync(SHARED_CSS, 'utf8') : ''
const globalClasses = new Set([
  ...classesDefinedIn(fs.readFileSync(GLOBAL_CSS, 'utf8')),
  ...classesDefinedIn(sharedCssSource),
])
const tokens = readTokens()
const shared = readShared()

for (const name of names) {
  try {
    await convert(name)
  } catch (err) {
    console.error(`\n✗ ${name}: ${err.message}`)
    process.exitCode = 1
  }
}

// ---------------------------------------------------------------------------
// Página o componente

async function convert(name) {
  const tsxPath = path.join(dir, name, `${name}.tsx`)
  const cssPath = path.join(dir, name, `${name}.css`)
  if (!fs.existsSync(tsxPath)) throw new Error(`no existe ${path.relative(ROOT, tsxPath)}`)

  const code = fs.readFileSync(tsxPath, 'utf8')
  const existingCss = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : ''
  const ownClasses = new Set([...globalClasses, ...classesDefinedIn(existingCss)])
  const prefix = ui ? `ui-${kebab(name)}` : kebab(name)

  const ast = parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] })
  const found = collectClassStrings(ast)

  const s = new MagicString(code)
  const nameByString = new Map() // string de utilidades → nombre de clase generado
  const taken = new Set(ownClasses) // nombres ya usados
  const rules = [] // { name, utilities }
  const unknown = new Set()
  let counter = 0

  // Nombre libre a partir de una base: base, base-2, base-3…
  const free = (base) => {
    let n = base
    for (let i = 2; taken.has(n); i++) n = `${base}-${i}`
    taken.add(n)
    return n
  }

  for (const { node, value, tag, slot, cva } of found.strings) {
    const tokens = value.split(/\s+/).filter(Boolean)
    const keep = []
    const utilities = []
    const candidates = tokens.filter((t) => !ownClasses.has(t) && !isMarker(t))
    const css = design.candidatesToCss(candidates)
    const valid = new Set(candidates.filter((_, i) => css[i]))

    for (const t of tokens) {
      if (valid.has(t)) utilities.push(t)
      else {
        keep.push(t)
        if (!ownClasses.has(t) && !isMarker(t)) unknown.add(t)
      }
    }
    if (!utilities.length) continue

    let cls
    if (cva) {
      // Variantes de cva(): nombre fijo, aunque coincida con otra combinación
      const base = ui ? `ui-${kebab(cva.stem)}` : `${prefix}-${kebab(cva.stem)}`
      cls = free(cva.variant ? `${base}--${cva.variant}` : base)
      rules.push({ name: cls, utilities })
    } else {
      const key = utilities.join(' ')
      cls = nameByString.get(key)
      if (!cls) {
        if (ui && slot) cls = free(`ui-${slot}`)
        else {
          do cls = `${prefix}-${tag}-${++counter}`
          while (taken.has(cls))
          taken.add(cls)
        }
        nameByString.set(key, cls)
        rules.push({ name: cls, utilities })
      }
    }
    s.overwrite(node.start + 1, node.end - 1, [...keep, cls].join(' '))
  }

  const rel = path.relative(ROOT, tsxPath)
  console.log(`\n● ${name} (${rel})`)

  // 1. Utilidades de Tailwind → clases nuevas
  let cssOut = existingCss
  if (rules.length) {
    let css = await buildCss(rules)
    if (ui) css = wrapInLayer(css, existingCss)
    const importLine = `import './${name}.css'`
    if (!code.includes(importLine)) {
      const lastImport = ast.program.body.filter((n) => n.type === 'ImportDeclaration').at(-1)
      if (lastImport) s.appendLeft(lastImport.end, `\n${importLine}`)
      else s.prepend(`${importLine}\n`)
    }
    const header = '/* Generado por scripts/tw-to-css.mjs — renombra las clases libremente */\n\n'
    cssOut = existingCss
      ? `${existingCss.trimEnd()}\n\n/* --- Generado por scripts/tw-to-css.mjs --- */\n\n${css}`
      : header + css

    console.log(`  ${rules.length} clases generadas`)
    for (const r of rules) console.log(`    .${r.name}  ←  ${r.utilities.join(' ')}`)
  } else {
    console.log('  Sin utilidades de Tailwind.')
  }
  reportExtras(found, unknown)
  if (!cssOut) return

  // 2. Valores sueltos → variables de variables.css
  const vars = applyVariables(cssOut)
  if (vars.count) console.log(`  ${vars.count} valores reemplazados por variables`)

  // 3. (páginas) Clases idénticas a una compartida → la compartida.
  //    En ui no: las compartidas no están en @layer y cambiaría quién gana.
  const sh = ui ? { css: vars.css, tsx: s.toString(), renamed: [] } : applyShared(vars.css, s.toString())
  for (const [from, to] of sh.renamed) console.log(`    .${from}  →  .${to} (compartida)`)

  const finalCss = sh.css
  const finalTsx = sh.tsx
  if (finalCss === existingCss && finalTsx === code) {
    console.log('  Nada que cambiar.')
    return
  }
  if (dry) {
    console.log(`\n--- ${path.relative(ROOT, cssPath)} (dry run) ---\n${finalCss}`)
    return
  }
  fs.writeFileSync(cssPath, finalCss)
  fs.writeFileSync(tsxPath, finalTsx)
  console.log(`  ✓ escrito ${path.relative(ROOT, cssPath)} y ${rel}`)
}

function reportExtras(found, unknown) {
  if (unknown.size) console.log(`  ⚠ clases desconocidas (se dejan igual): ${[...unknown].join(', ')}`)
  for (const loc of found.skipped)
    console.log(`  ⚠ línea ${loc.line}: className con template literal \${…}, revisar a mano`)
}

// ---------------------------------------------------------------------------
// TSX: encontrar strings de clases

function collectClassStrings(ast) {
  const strings = []
  const skipped = []

  traverse(ast, {
    JSXAttribute(attr) {
      if (attr.node.name.name !== 'className') return
      const tag = tagName(attr.parentPath.node.name)
      const slot = dataSlot(attr.parentPath.node)
      const value = attr.node.value
      if (!value) return

      if (value.type === 'StringLiteral') {
        strings.push({ node: value, value: value.value, tag, slot })
        return
      }
      attr.get('value').traverse({
        StringLiteral(p) {
          if (isClassString(p)) strings.push({ node: p.node, value: p.node.value, tag, slot })
        },
        TemplateLiteral(p) {
          if (!isClassString(p)) return
          if (p.node.expressions.length) skipped.push(p.node.loc.start)
          else strings.push({ node: p.node, value: p.node.quasis[0].value.cooked, tag, slot })
        },
      })
    },

    // const buttonVariants = cva('base…', { variants: { variant: { outline: '…' } }, compoundVariants: [...] })
    CallExpression(p) {
      if (p.node.callee.name !== 'cva') return
      const id = p.parent.type === 'VariableDeclarator' ? p.parent.id.name : 'variants'
      const stem = id.replace(/Variants$/, '') || id
      const [base, config] = p.node.arguments
      const push = (node, variant) => {
        const value = literalValue(node)
        if (value === null) return node && skipped.push(node.loc.start)
        strings.push({ node, value, tag: 'cva', cva: { stem, variant } })
      }

      push(base, null)
      if (config?.type !== 'ObjectExpression') return
      for (const prop of config.properties) {
        const section = propName(prop)
        if (section === 'variants' && prop.value.type === 'ObjectExpression') {
          for (const group of prop.value.properties) {
            if (group.value?.type !== 'ObjectExpression') continue
            for (const option of group.value.properties)
              push(option.value, `${kebab(propName(group))}-${kebab(propName(option))}`)
          }
        }
        if (section === 'compoundVariants' && prop.value.type === 'ArrayExpression') {
          prop.value.elements.forEach((obj, i) => {
            const cls = obj?.properties?.find((x) => ['class', 'className'].includes(propName(x)))
            if (cls) push(cls.value, `combinada-${i + 1}`)
          })
        }
      }
    },
  })
  return { strings, skipped }
}

// Texto de un StringLiteral o TemplateLiteral sin ${}; null si no lo es.
function literalValue(node) {
  if (node?.type === 'StringLiteral') return node.value
  if (node?.type === 'TemplateLiteral' && !node.expressions.length) return node.quasis[0].value.cooked
  return null
}

function propName(prop) {
  return prop.key?.name ?? prop.key?.value ?? ''
}

// Valor de data-slot="…" del elemento JSX, si tiene.
function dataSlot(opening) {
  const attr = opening.attributes.find((a) => a.type === 'JSXAttribute' && a.name.name === 'data-slot')
  return attr?.value?.type === 'StringLiteral' ? attr.value.value : null
}

// Descarta strings que no son clases: comparaciones (`x === 'a'`) o
// argumentos de funciones que no sean cn()/clsx().
function isClassString(p) {
  if (p.parent.type === 'BinaryExpression') return false
  if (p.parent.type === 'ObjectProperty' && p.parent.value === p.node) return false
  for (let cur = p.parentPath; cur && cur.type !== 'JSXAttribute'; cur = cur.parentPath) {
    if (cur.type === 'CallExpression' && !CLASS_HELPERS.has(cur.node.callee.name)) return false
  }
  return true
}

function tagName(n) {
  if (n.type === 'JSXIdentifier') return n.name.toLowerCase()
  if (n.type === 'JSXMemberExpression') return n.property.name.toLowerCase()
  return 'el'
}

// ---------------------------------------------------------------------------
// CSS

async function buildCss(rules) {
  const input = TW_PRELUDE + rules.map((r) => `.${r.name} { @apply ${r.utilities.join(' ')}; }`).join('\n')
  const compiler = await compile(input, { base: SRC, onDependency() {} })
  const { code } = optimize(compiler.build([]))
  return cleanup(code)
}

/**
 * Mete el CSS de un componente en @layer components: así las utilidades de
 * Tailwind (@layer utilities) que se le pasen por className siguen ganando,
 * como hacía tailwind-merge. Las @keyframes y @property quedan fuera.
 */
function wrapInLayer(css, existingCss) {
  const root = postcss.parse(css)
  const inside = []
  const outside = []
  root.each((n) => {
    const global = n.type === 'atrule' && (n.name === 'keyframes' || n.name === 'property')
    ;(global ? outside : inside).push(n.toString().replace(/^\s+/, ''))
  })
  const indent = (text) => text.replace(/^(?=.)/gm, '  ')
  const declaration = existingCss.includes(LAYER_ORDER) ? '' : `${LAYER_ORDER}\n\n`
  const layer = `@layer components {\n${indent(inside.join('\n\n'))}\n}`
  return declaration + [layer, ...outside].join('\n\n') + '\n'
}

/** Deja solo las reglas generadas y las hace legibles. */
function cleanup(code) {
  const root = postcss.parse(code)
  const properties = new Map() // --tw-x → initial-value

  root.each((node) => {
    if (node.type === 'comment') node.remove()
    else if (node.type === 'atrule' && node.name === 'layer') node.remove()
    else if (node.type === 'atrule' && node.name === 'property') {
      let initial
      node.walkDecls('initial-value', (d) => {
        initial = d.value
      })
      properties.set(node.params.trim(), initial)
      node.remove()
    }
  })

  unwrapColorMixSupports(root)
  splitSelectorLists(root)
  mergeAdjacentRules(root)
  inlineVariables(root, properties)

  root.walkDecls((d) => {
    d.value = simplifyCalc(d.value).replace(/3\.40282e38px/g, '9999px').replace(/\s{2,}/g, ' ').trim()
    if (d.prop === 'box-shadow') d.value = cleanBoxShadow(d.value)
    if (!d.value) d.remove()
  })
  // Declaraciones idénticas repetidas en la misma regla
  root.walkRules((r) => {
    const seen = new Set()
    r.each((d) => {
      if (d.type !== 'decl') return
      const k = `${d.prop}:${d.value}`
      if (seen.has(k)) d.remove()
      seen.add(k)
    })
  })
  root.walkRules((r) => {
    if (!r.nodes.length) r.remove()
  })
  root.walkAtRules((a) => {
    if (a.nodes?.length === 0) a.remove()
  })

  // @property de las variables --tw-* que siguen en uso
  const used = new Set(root.toString().match(/--tw-[\w-]+/g))
  for (const [name, initial] of properties) {
    if (!used.has(name)) continue
    const at = postcss.atRule({ name: 'property', params: name })
    at.append({ prop: 'syntax', value: '"*"' }, { prop: 'inherits', value: 'false' })
    if (initial !== undefined) at.append({ prop: 'initial-value', value: initial })
    root.append(at)
  }

  root.each((n, i) => (n.raws.before = i ? '\n\n' : ''))
  return root.toString().trim() + '\n'
}

// `a { color: X } @supports (color-mix…) { a { color: color-mix(…) } }` → `a { color: color-mix(…) }`
function unwrapColorMixSupports(root) {
  root.walkAtRules('supports', (at) => {
    if (!at.params.includes('color-mix')) return
    at.each((inner) => {
      if (inner.type !== 'rule') return
      let target = at.prev()
      while (target && !(target.type === 'rule' && target.selector === inner.selector)) target = target.prev()
      inner.each((d) => {
        let replaced = false
        target?.walkDecls(d.prop, (old) => {
          old.value = d.value
          replaced = true
        })
        if (!replaced) {
          if (target) target.append(d.clone())
          else at.before(postcss.rule({ selector: inner.selector, nodes: [d.clone()] }))
        }
      })
    })
    at.remove()
  })
}

/**
 * - var(--tema, fallback) → fallback (Tailwind ya puso el valor del tema como fallback).
 * - var(--tw-x…): las --tw-* no se heredan, así que solo importa lo que se define en el mismo
 *   elemento. Las reglas se agrupan por elemento (`.x`, `.x:hover`, `.x[data-state=open]` y
 *   `@media … .x` son el mismo; `.x svg` o `.x::after`, otro):
 *   · si el elemento la define una sola vez, en la misma regla o en la regla base → se sustituye;
 *   · si no la define nunca → fallback o initial-value de su @property;
 *   · si la define en estados o variantes (hover:, data-[state]:, sm:…) → se deja la variable.
 * - Las --tw-* que usan las @keyframes (animaciones de entrada/salida) no se tocan.
 * Las variables del proyecto (var(--gold), …) no tienen fallback y se respetan.
 */
function inlineVariables(root, properties) {
  root.walkDecls((d) => {
    d.value = replaceVars(d.value, (name, fb) => (name.startsWith('--tw-') ? null : fb))
  })

  const inKeyframes = (d) => d.parent.parent?.type === 'atrule' && d.parent.parent.name === 'keyframes'
  const keyframeVars = new Set()
  root.walkDecls((d) => {
    if (inKeyframes(d)) for (const m of d.value.matchAll(/var\((--tw-[\w-]+)/g)) keyframeVars.add(m[1])
  })

  const setters = new Map() // "elemento|--tw-x" → [decl]
  const key = (d, name) => `${elementKey(d.parent.selector)}|${name}`
  root.walkDecls(/^--tw-/, (d) => {
    if (!inKeyframes(d)) setters.set(key(d, d.prop), [...(setters.get(key(d, d.prop)) ?? []), d])
  })

  root.walkDecls((d) => {
    if (inKeyframes(d)) return
    // Se repite porque un valor sustituido puede traer otras var(--tw-…) dentro
    for (let i = 0, prev; i < 10 && prev !== d.value; i++) {
      prev = d.value
      d.value = replaceVars(d.value, (name, fb) => {
        if (!name.startsWith('--tw-') || keyframeVars.has(name)) return null
        const set = setters.get(key(d, name))
        if (!set) return fb ?? properties.get(name) ?? ''
        const [only] = set
        if (set.length > 1) return null
        if (only.parent === d.parent) return only.value
        // Desde la regla base, pero solo de la misma clase: la de una variante (--outline)
        // no está siempre en el elemento
        if (isBaseRule(only.parent) && classOf(only.parent.selector) === classOf(d.parent.selector)) return only.value
        return null
      })
    }
  })

  // Quitar definiciones --tw-* que su elemento ya no usa
  const usedBy = new Map() // elemento → CSS de sus declaraciones
  root.walkDecls((d) => {
    if (d.prop.startsWith('--tw-') || inKeyframes(d)) return
    const k = elementKey(d.parent.selector)
    usedBy.set(k, (usedBy.get(k) ?? '') + d.value)
  })
  for (const decls of setters.values()) {
    for (const d of decls) {
      if (keyframeVars.has(d.prop)) continue
      if (!(usedBy.get(elementKey(d.parent.selector)) ?? '').includes(`var(${d.prop}`)) d.remove()
    }
  }
}

/**
 * Identifica el elemento al que apunta un selector (ver inlineVariables).
 * `.x--variante` cuenta como el mismo elemento que `.x` (las variantes de cva van juntas).
 */
function elementKey(selector) {
  if (selector.startsWith(':where(')) return selector // :where(.x > …): hijos de .x
  const flat = selector.replace(/\((?:[^()]|\([^()]*\))*\)/g, '').replace(/\[[^\]]*\]/g, '')
  if (/[\s>+~]/.test(flat.trim())) return selector // descendientes: .x svg
  const cls = (classOf(flat) ?? flat).replace(/--.*$/, '')
  const pseudo = flat.match(/::[\w-]+/)?.[0] ?? ''
  return cls + pseudo
}

function classOf(selector) {
  return selector.match(/\.(-?[_a-zA-Z][\w-]*)/)?.[1] ?? null
}

/** Regla que siempre aplica a su elemento: sin @media ni estados (`.x`, `.x::after`, `:where(.x > …)`). */
function isBaseRule(rule) {
  if (rule.parent.type !== 'root') return false
  return /^\.[\w-]+(::[\w-]+)?$/.test(rule.selector) || rule.selector.startsWith(':where(')
}

/** Reemplaza var(--x[, fallback]) respetando paréntesis anidados. `fn` devuelve el reemplazo o null. */
function replaceVars(value, fn) {
  let out = ''
  let i = 0
  while (i < value.length) {
    const start = value.indexOf('var(', i)
    if (start === -1) break
    let depth = 0
    let end = start + 3
    let comma = -1
    for (; end < value.length; end++) {
      const ch = value[end]
      if (ch === '(') depth++
      else if (ch === ')' && --depth === 0) break
      else if (ch === ',' && depth === 1 && comma === -1) comma = end
    }
    const name = value.slice(start + 4, comma === -1 ? end : comma).trim()
    const fbRaw = comma === -1 ? undefined : value.slice(comma + 1, end)
    const fb = fbRaw === undefined ? undefined : replaceVars(fbRaw, fn).trim()
    const rep = fn(name, fb)
    out += value.slice(i, start)
    const text = rep ?? `var(${name}${fb === undefined ? '' : `, ${fb}`})`
    // `var(--a)var(--b)` es válido, pero `.15sease` no: separar los valores sustituidos
    const glued = (a, b) => /[\w.%)]$/.test(a) && /^[\w.#(]/.test(b)
    if (text && glued(out, text)) out += ' '
    out += text
    if (text && glued(text, value.slice(end + 1))) out += ' '
    i = end + 1
  }
  return out + value.slice(i)
}

/** Resuelve calc() con números simples: calc(.25rem * 5) → 1.25rem, calc(1 / 2 * 100%) → 50%. */
function simplifyCalc(value) {
  const NUM = /^(-?(?:\d+\.?\d*|\.\d+))([a-z%]*)$/
  const fmt = (n, unit) => `${+n.toFixed(4)}${n === 0 ? '' : unit}`

  const evaluate = (body) => {
    const parts = body.trim().split(/\s+/)
    if (parts.length % 2 === 0) return null
    const ops = parts.filter((_, i) => i % 2)
    const nums = parts.filter((_, i) => !(i % 2)).map((p) => p.match(NUM))
    if (nums.some((n) => !n)) return null

    if (ops.every((o) => o === '*' || o === '/')) {
      let unit = ''
      let x = 1
      for (let i = 0; i < nums.length; i++) {
        const [, v, u] = nums[i]
        if (u && (unit || ops[i - 1] === '/')) return null // solo una unidad, nunca dividiendo
        unit ||= u
        x = i && ops[i - 1] === '/' ? x / +v : x * +v
      }
      return fmt(x, unit)
    }
    if (ops.every((o) => o === '+' || o === '-')) {
      const units = new Set(nums.map((n) => n[2]).filter((u, i) => u || +nums[i][1] !== 0))
      if (units.size > 1) return null
      const x = nums.reduce((acc, n, i) => (i && ops[i - 1] === '-' ? acc - +n[1] : acc + +n[1]), 0)
      return fmt(x, [...units][0] ?? '')
    }
    return null
  }

  let prev
  do {
    prev = value
    value = value.replace(/calc\(([^()]*)\)/g, (m, body) => evaluate(body) ?? m)
    // calc(X * 0) / calc(0 * X) con X no numérico (p. ej. var())
    value = value.replace(/calc\(\s*[^()]*\*\s*0\s*\)|calc\(\s*0\s*\*[^()]*\)/g, '0')
  } while (value !== prev)
  return value
}

/** Quita las sombras vacías (`0 0 #0000`) que Tailwind usa para componer ring/shadow. */
function cleanBoxShadow(value) {
  const shadows = []
  let depth = 0
  let cur = ''
  for (const ch of value) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && !depth) {
      shadows.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  shadows.push(cur.trim())
  const real = shadows.filter((sh) => sh && sh !== '0 0 #0000')
  return real.length ? real.join(', ') : 'none'
}

/** `.a, .b { … }` → `.a { … } .b { … }` para que cada clase se pueda renombrar sola. */
function splitSelectorLists(container) {
  container.each((node) => {
    if (node.type === 'atrule') splitSelectorLists(node)
    if (node.type !== 'rule' || node.selectors.length < 2) return
    for (const sel of node.selectors) node.before(node.clone({ selector: sel }))
    node.remove()
  })
}

function mergeAdjacentRules(container) {
  container.each((node) => {
    if (node.type === 'atrule') mergeAdjacentRules(node)
    if (node.type !== 'rule') return
    let next = node.next()
    while (next && next.type === 'rule' && next.selector === node.selector) {
      next.each((d) => {
        node.walkDecls(d.prop, (old) => old.remove())
        node.append(d.clone())
      })
      const after = next.next()
      next.remove()
      next = after
    }
  })
}

// ---------------------------------------------------------------------------
// Variables (src/styles/variables.css)

/** Lee las variables propias de variables.css, agrupadas por para qué sirven. */
function readTokens() {
  const t = {
    sizes: [], // { name, rem, leading, ratio } — --texto-* y su --texto-*-interlineado
    leadings: [], // { name, value } — --interlineado-*
    spaces: [], // { name, rem } — --espacio-*
    icons: [], // { name, rem } — --icono-*
    containers: [], // { name, rem } — --contenedor-*
    exact: new Map(), // propiedad → Map(valor normalizado → nombre)
    colors: new Map(), // color-mix(…) normalizado → nombre
  }
  if (!fs.existsSync(VARIABLES_CSS)) return t

  const all = new Map()
  postcss.parse(fs.readFileSync(VARIABLES_CSS, 'utf8')).walkDecls(/^--/, (d) => {
    if (d.parent.selector === ':root') all.set(d.prop, d.value)
  })
  const exact = (prop, name, value) => {
    if (!t.exact.has(prop)) t.exact.set(prop, new Map())
    t.exact.get(prop).set(norm(value), name)
  }

  for (const [name, value] of all) {
    if (/^--texto-\w+$/.test(name) && toRem(value) !== null) {
      const leading = `${name}-interlineado`
      t.sizes.push({ name, rem: toRem(value), leading, ratio: all.has(leading) ? +all.get(leading) : null })
    } else if (name.startsWith('--interlineado-')) t.leadings.push({ name, value: +value })
    else if (name.startsWith('--espacio-')) t.spaces.push({ name, rem: toRem(value) })
    else if (name.startsWith('--icono-')) t.icons.push({ name, rem: toRem(value) })
    else if (name.startsWith('--contenedor-')) t.containers.push({ name, rem: toRem(value) })
    else if (name.startsWith('--radio-')) exact('border-radius', name, value)
    else if (name.startsWith('--peso-')) exact('font-weight', name, value)
    else if (name.startsWith('--fuente-')) exact('font-family', name, value)
    else if (name === '--transicion-duracion') exact('transition-duration', name, value)
    else if (name === '--transicion-curva') exact('transition-timing-function', name, value)
    else if (value.startsWith('color-mix(')) t.colors.set(norm(value), name)
  }
  return t
}

/** Cambia valores sueltos por variables de variables.css. Devuelve { css, count }. */
function applyVariables(css) {
  const root = postcss.parse(css)
  let count = 0
  const set = (d, value) => {
    if (value !== d.value) {
      d.value = value
      count++
    }
  }
  const byRem = (list, rem) => list.find((x) => x.rem !== null && Math.abs(x.rem - rem) < 1e-4)

  root.walkDecls((d) => {
    if (d.prop.startsWith('--')) return
    const p = d.prop

    // Colores derivados: color-mix(…) dentro de cualquier valor
    if (d.value.includes('color-mix(')) set(d, replaceColorMix(d.value))

    if (p === 'font-size') {
      const tok = toRem(d.value) !== null && byRem(tokens.sizes, toRem(d.value))
      if (tok) set(d, `var(${tok.name})`)
    } else if (SPACING_PROP.test(p)) {
      set(
        d,
        d.value
          .split(/\s+/)
          .map((part) => {
            const rem = toRem(part)
            if (rem === null || rem === 0) return part
            const tok = byRem(tokens.spaces, Math.abs(rem))
            if (!tok) return part
            return rem < 0 ? `calc(var(${tok.name}) * -1)` : `var(${tok.name})`
          })
          .join(' '),
      )
    } else if (p === 'max-width') {
      const tok = toRem(d.value) !== null && byRem(tokens.containers, toRem(d.value))
      if (tok) set(d, `var(${tok.name})`)
    } else if (p === 'transition-property') {
      set(d, d.value.split(/\s*,\s*/).filter((x) => !x.startsWith('--tw-')).join(', '))
    } else if (p === 'animation' || p === 'animation-name') {
      const [first, ...rest] = d.value.split(/\s+/)
      if (KEYFRAMES_ALIAS[first]) set(d, [KEYFRAMES_ALIAS[first], ...rest].join(' '))
    } else if (tokens.exact.has(p)) {
      const name = tokens.exact.get(p).get(norm(d.value))
      if (name) set(d, `var(${name})`)
    }
  })

  // Segunda pasada: lo que depende de otras declaraciones de la misma regla
  root.walkRules((r) => {
    const decl = (prop) => r.nodes.find((n) => n.type === 'decl' && n.prop === prop)

    // line-height → interlineado del tamaño de la misma regla (o uno general)
    const lh = decl('line-height')
    if (lh && !lh.value.startsWith('var(')) {
      const fs_ = decl('font-size')
      const sizeName = fs_?.value.match(/^var\((--texto-[\w]+)\)$/)?.[1]
      const size = tokens.sizes.find((x) => x.name === sizeName)
      const asRatio = lh.value.endsWith('rem') && size ? toRem(lh.value) / size.rem : +lh.value
      if (size?.ratio != null && Math.abs(asRatio - size.ratio) < 0.001) set(lh, `var(${size.leading})`)
      else {
        const tok = tokens.leadings.find((x) => Math.abs(x.value - asRatio) < 0.001)
        if (tok && !Number.isNaN(asRatio)) set(lh, `var(${tok.name})`)
      }
    }

    // width/height iguales → icono
    const w = decl('width')
    const h = decl('height')
    if (w && h && w.value === h.value && toRem(w.value) !== null) {
      const tok = byRem(tokens.icons, toRem(w.value))
      if (tok) {
        set(w, `var(${tok.name})`)
        set(h, `var(${tok.name})`)
      }
    }
  })

  return { css: root.toString(), count }
}

function replaceColorMix(value) {
  let out = ''
  let i = 0
  for (let start; (start = value.indexOf('color-mix(', i)) !== -1; ) {
    let depth = 0
    let end = start
    for (; end < value.length; end++) {
      if (value[end] === '(') depth++
      else if (value[end] === ')' && --depth === 0) break
    }
    const chunk = value.slice(start, end + 1)
    const name = tokens.colors.get(norm(chunk))
    out += value.slice(i, start) + (name ? `var(${name})` : chunk)
    i = end + 1
  }
  return out + value.slice(i)
}

// ---------------------------------------------------------------------------
// Clases compartidas (src/styles/compartidos.css)

/** Firma de cada clase de compartidos.css → nombre. */
function readShared() {
  const bySignature = new Map()
  const keyframes = new Set()
  if (!sharedCssSource) return { bySignature, keyframes }
  const root = postcss.parse(applyVariables(sharedCssSource).css)
  root.walkAtRules('keyframes', (a) => keyframes.add(a.params.trim()))
  for (const cls of classesDefinedIn(sharedCssSource)) {
    const sig = signature(root, cls)
    if (sig) bySignature.set(sig, cls)
  }
  return { bySignature, keyframes }
}

/**
 * Representa todos los estilos de una clase (reglas, @media, :hover…) como texto,
 * para comparar dos clases. null si la clase aparece junto a otras en un selector.
 */
function signature(root, cls) {
  const re = new RegExp(`\\.${escapeRe(cls)}(?![\\w-])`, 'g')
  const parts = []
  let mixed = false
  root.walkRules((r) => {
    if (r.parent.type === 'atrule' && r.parent.name === 'keyframes') return
    if (!re.test(r.selector)) return
    re.lastIndex = 0
    const sel = r.selector.replace(re, '&')
    if (/\.[a-zA-Z_-]/.test(sel)) mixed = true
    const ctx = []
    for (let p = r.parent; p && p.type === 'atrule'; p = p.parent) ctx.unshift(`@${p.name} ${p.params}`)
    const decls = r.nodes.filter((n) => n.type === 'decl').map((d) => `${d.prop}:${norm(d.value)}`).sort()
    parts.push(`${ctx.join(' ')}|${sel}|${decls.join(';')}`)
  })
  return mixed || !parts.length ? null : parts.sort().join('\n')
}

/** Sustituye en la página las clases idénticas a una compartida. */
function applyShared(css, tsx) {
  const root = postcss.parse(css)
  const renamed = new Map()

  for (const cls of classesDefinedIn(css)) {
    if (globalClasses.has(cls)) continue
    const target = shared.bySignature.get(signature(root, cls))
    if (!target) continue
    renamed.set(cls, target)
    const re = new RegExp(`\\.${escapeRe(cls)}(?![\\w-])`)
    root.walkRules((r) => {
      if (re.test(r.selector)) r.remove()
    })
    tsx = tsx.replace(new RegExp(`(?<=["'\`\\s])${escapeRe(cls)}(?=["'\`\\s])`, 'g'), target)
  }

  // @keyframes que ya están en compartidos.css
  root.walkAtRules('keyframes', (a) => {
    const name = a.params.trim()
    if (shared.keyframes.has(KEYFRAMES_ALIAS[name] ?? name)) a.remove()
  })
  root.walkAtRules((a) => {
    if (a.nodes?.length === 0) a.remove()
  })

  return { css: root.toString().replace(/\n{3,}/g, '\n\n').trimEnd() + '\n', tsx, renamed }
}

// ---------------------------------------------------------------------------
// Utilidades

function classesDefinedIn(css) {
  const code = css.replace(/\/\*[\s\S]*?\*\//g, '')
  return new Set([...code.matchAll(/\.(-?[a-zA-Z_][\w-]*)/g)].map((m) => m[1]))
}

/** Normaliza un valor CSS para compararlo: sin comillas, espacios ni ceros a la izquierda. */
function norm(v) {
  return v
    .toLowerCase()
    .replace(/["']/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([,()*/])\s*/g, '$1')
    .replace(/(^|[^\d.])0+(\.\d)/g, '$1$2')
    .replace(/(^|[^\d.])(\.?\d+(?:\.\d+)?)ms\b/g, (_, pre, n) => `${pre}${+n / 1000}s`)
    .replace(/(^|[^\d])0\.(\d)/g, '$1.$2')
    .trim()
}

/** '1.25rem' → 1.25 · '-0.5rem' → -0.5 · '0' → 0 · otra cosa → null */
function toRem(v) {
  const m = String(v).trim().match(/^(-?(?:\d+\.?\d*|\.\d+))(rem)?$/)
  if (!m) return null
  if (!m[2] && +m[1] !== 0) return null
  return +m[1]
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function kebab(s) {
  return s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}
