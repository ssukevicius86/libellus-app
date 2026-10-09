#!/usr/bin/env node
/**
 * Convierte las clases de Tailwind de una página a CSS puro.
 *
 *   node scripts/tw-to-css.mjs <Page> [<Page>…] [--dry]
 *   node scripts/tw-to-css.mjs --all [--dry]
 *
 * Para cada `className` de src/pages/<Page>/<Page>.tsx crea una clase
 * `<page>-<etiqueta>-<n>` en src/pages/<Page>/<Page>.css con el CSS que
 * Tailwind generaría, y reemplaza las utilidades en el .tsx.
 * Las clases propias (las de src/index.css o del .css de la página) se conservan.
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
const GLOBAL_CSS = path.join(SRC, 'index.css')

// Funciones que combinan clases: sus argumentos string se convierten.
const CLASS_HELPERS = new Set(['cn', 'clsx'])
// Marcadores de Tailwind que no generan CSS pero los usan otras utilidades (group-hover:…).
const MARKERS = new Set(['group', 'peer'])

const TW_PRELUDE = `@import "tailwindcss/theme" theme(inline);\n@import "./index.css" reference;\n`

// ---------------------------------------------------------------------------
// CLI

const args = process.argv.slice(2)
const dry = args.includes('--dry')
const pages = args.includes('--all')
  ? fs.readdirSync(PAGES).filter((d) => fs.existsSync(path.join(PAGES, d, `${d}.tsx`)))
  : args.filter((a) => !a.startsWith('--'))

if (!pages.length) {
  console.log('Uso: node scripts/tw-to-css.mjs <Page> [<Page>…] [--dry]  |  --all [--dry]')
  process.exit(1)
}

const design = await __unstable__loadDesignSystem(TW_PRELUDE, { base: SRC })
const globalClasses = classesDefinedIn(fs.readFileSync(GLOBAL_CSS, 'utf8'))

for (const page of pages) {
  try {
    await convertPage(page)
  } catch (err) {
    console.error(`\n✗ ${page}: ${err.message}`)
    process.exitCode = 1
  }
}

// ---------------------------------------------------------------------------
// Página

async function convertPage(page) {
  const tsxPath = path.join(PAGES, page, `${page}.tsx`)
  const cssPath = path.join(PAGES, page, `${page}.css`)
  if (!fs.existsSync(tsxPath)) throw new Error(`no existe ${path.relative(ROOT, tsxPath)}`)

  const code = fs.readFileSync(tsxPath, 'utf8')
  const existingCss = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : ''
  const ownClasses = new Set([...globalClasses, ...classesDefinedIn(existingCss)])
  const prefix = kebab(page)

  const ast = parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] })
  const found = collectClassStrings(ast)

  const s = new MagicString(code)
  const nameByString = new Map() // string de utilidades → nombre de clase generado
  const rules = [] // { name, utilities }
  const unknown = new Set()
  let counter = 0

  for (const { node, value, tag } of found.strings) {
    const tokens = value.split(/\s+/).filter(Boolean)
    const keep = []
    const utilities = []
    const candidates = tokens.filter((t) => !ownClasses.has(t) && !MARKERS.has(t))
    const css = design.candidatesToCss(candidates)
    const valid = new Set(candidates.filter((_, i) => css[i]))

    for (const t of tokens) {
      if (valid.has(t)) utilities.push(t)
      else {
        keep.push(t)
        if (!ownClasses.has(t) && !MARKERS.has(t)) unknown.add(t)
      }
    }
    if (!utilities.length) continue

    const key = utilities.join(' ')
    let name = nameByString.get(key)
    if (!name) {
      do name = `${prefix}-${tag}-${++counter}`
      while (ownClasses.has(name))
      nameByString.set(key, name)
      rules.push({ name, utilities })
    }
    s.overwrite(node.start + 1, node.end - 1, [...keep, name].join(' '))
  }

  const rel = path.relative(ROOT, tsxPath)
  console.log(`\n● ${page} (${rel})`)
  if (!rules.length) {
    console.log('  Sin utilidades de Tailwind: nada que convertir.')
    reportExtras(found, unknown)
    return
  }

  const css = await buildCss(rules)
  const importLine = `import './${page}.css'`
  if (!code.includes(importLine)) {
    const lastImport = ast.program.body.filter((n) => n.type === 'ImportDeclaration').at(-1)
    if (lastImport) s.appendLeft(lastImport.end, `\n${importLine}`)
    else s.prepend(`${importLine}\n`)
  }

  const header = '/* Generado por scripts/tw-to-css.mjs — renombra las clases libremente */\n\n'
  const cssOut = existingCss
    ? `${existingCss.trimEnd()}\n\n/* --- Generado por scripts/tw-to-css.mjs --- */\n\n${css}`
    : header + css

  console.log(`  ${rules.length} clases generadas`)
  for (const r of rules) console.log(`    .${r.name}  ←  ${r.utilities.join(' ')}`)
  reportExtras(found, unknown)

  if (dry) {
    console.log(`\n--- ${path.relative(ROOT, cssPath)} (dry run) ---\n${css}`)
    return
  }
  fs.writeFileSync(cssPath, cssOut)
  fs.writeFileSync(tsxPath, s.toString())
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
      const value = attr.node.value
      if (!value) return

      if (value.type === 'StringLiteral') {
        strings.push({ node: value, value: value.value, tag })
        return
      }
      attr.get('value').traverse({
        StringLiteral(p) {
          if (isClassString(p)) strings.push({ node: p.node, value: p.node.value, tag })
        },
        TemplateLiteral(p) {
          if (!isClassString(p)) return
          if (p.node.expressions.length) skipped.push(p.node.loc.start)
          else strings.push({ node: p.node, value: p.node.quasis[0].value.cooked, tag })
        },
      })
    },
  })
  return { strings, skipped }
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

/** Deja solo las reglas generadas y las hace legibles. */
function cleanup(code) {
  const root = postcss.parse(code)
  const properties = new Map() // --tw-x → initial-value

  root.each((node) => {
    if (node.type === 'comment') node.remove()
    else if (node.type === 'atrule' && node.name === 'layer') node.remove()
    else if (node.type === 'atrule' && node.name === 'property') {
      let initial
      node.walkDecls('initial-value', (d) => (initial = d.value))
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
  root.walkRules((r) => r.nodes.length || r.remove())
  root.walkAtRules((a) => a.nodes?.length === 0 && a.remove())

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
 * - var(--tw-x…): las --tw-* no se heredan, así que solo importa lo que define el mismo selector.
 *   · si ese selector la define una única vez, en la misma regla o sin @media → se sustituye por su valor;
 *   · si no la define nunca → fallback o initial-value de su @property;
 *   · si la define en variantes (hover:, sm:…) → se deja la variable.
 * Las variables del proyecto (var(--gold), …) no tienen fallback y se respetan.
 */
function inlineVariables(root, properties) {
  root.walkDecls((d) => (d.value = replaceVars(d.value, (name, fb) => (name.startsWith('--tw-') ? null : fb))))

  const setters = new Map() // "selector|--tw-x" → [decl]
  const key = (d, name) => `${d.parent.selector}|${name}`
  root.walkDecls(/^--tw-/, (d) => setters.set(key(d, d.prop), [...(setters.get(key(d, d.prop)) ?? []), d]))

  root.walkDecls((d) => {
    // Se repite porque un valor sustituido puede traer otras var(--tw-…) dentro
    for (let i = 0, prev; i < 10 && prev !== d.value; i++) {
      prev = d.value
      d.value = replaceVars(d.value, (name, fb) => {
        if (!name.startsWith('--tw-')) return null
        const set = setters.get(key(d, name))
        if (!set) return fb ?? properties.get(name) ?? ''
        const always = set[0].parent === d.parent || set[0].parent.parent.type === 'root'
        if (set.length === 1 && always) return set[0].value
        return null
      })
    }
  })

  // Quitar definiciones --tw-* que su selector ya no usa
  const usedBy = new Map() // selector → CSS de sus declaraciones
  root.walkDecls((d) => {
    if (!d.prop.startsWith('--tw-')) usedBy.set(d.parent.selector, (usedBy.get(d.parent.selector) ?? '') + d.value)
  })
  for (const decls of setters.values()) {
    for (const d of decls) if (!(usedBy.get(d.parent.selector) ?? '').includes(`var(${d.prop}`)) d.remove()
  }
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
    out += rep ?? `var(${name}${fb === undefined ? '' : `, ${fb}`})`
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
// Utilidades

function classesDefinedIn(css) {
  return new Set([...css.matchAll(/\.(-?[a-zA-Z_][\w-]*)/g)].map((m) => m[1]))
}

function kebab(s) {
  return s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}
