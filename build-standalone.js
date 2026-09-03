/**
 * Bundles web/ into one self-contained HTML file.
 *
 *   node build-standalone.js
 *   -> dist/electrical-safety-check.html
 *
 * The point is a file you can email. Deployment does not need this — web/
 * uploads as-is and needs no build — but a folder of twenty files that only
 * works behind a web server is awkward to hand to someone for review. The
 * single file has no imports, so a browser will open it straight off the disk.
 *
 * What it does:
 *   - inlines css/app.css
 *   - concatenates the ES modules into a tiny module registry, so each keeps
 *     its own scope and the same names can appear in more than one file
 *   - drops store-supabase.js, which the demo build cannot use anyway
 *   - stitches the three pages into three hash routes in one document
 *
 * pdf-lib still loads from a CDN, so the PDF button needs a connection.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const WEB = join(ROOT, 'web')
const OUT_DIR = join(ROOT, 'dist')
const OUT_FILE = join(OUT_DIR, 'electrical-safety-check.html')

const PDF_LIB_CDN = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js'

/**
 * Dependency order. Hand-maintained rather than resolved, because the graph is
 * small, stable, and a wrong order fails loudly on the first open.
 */
const MODULES = [
  'config.js',
  'dates.js',
  'catalog.js',
  'reference.js',
  'validate.js',
  'dom.js',
  'store-local.js',
  'db.js',
  'pdf.js',
  'signature.js',
  'sample.js',
  'register.js',
  'detail.js',
  'form.js',
]

/** Modules deliberately left out of the standalone build. */
const EXCLUDED = new Set(['store-supabase.js'])

// ---------------------------------------------------------------------------
// Module transform
// ---------------------------------------------------------------------------

/**
 * Rewrites one ES module into a factory body for the registry.
 *
 * Only the import and export forms this project actually uses are handled. An
 * unrecognised one throws rather than silently producing a broken bundle.
 */
function transform(name, source) {
  const exported = new Set()
  let code = source

  // import { a, b as c } from './x.js'   ->   const { a, b: c } = __req('x.js')
  code = code.replace(
    /^import\s*\{([^}]+)\}\s*from\s*'\.\/([\w.-]+)'\s*$/gm,
    (line, names, from) => {
      if (EXCLUDED.has(from)) return ''
      const bindings = names
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const [original, alias] = part.split(/\s+as\s+/).map((s) => s.trim())
          return alias ? `${original}: ${alias}` : original
        })
        .join(', ')
      return `const { ${bindings} } = __req('${from}')`
    },
  )

  // import * as ns from './x.js'   ->   const ns = __req('x.js')
  code = code.replace(
    /^import\s*\*\s*as\s+(\w+)\s*from\s*'\.\/([\w.-]+)'\s*$/gm,
    (line, ns, from) => (EXCLUDED.has(from) ? `const ${ns} = {}` : `const ${ns} = __req('${from}')`),
  )

  // await import('./x.js')   ->   __req('x.js')
  code = code.replace(/await\s+import\('\.\/([\w.-]+)'\)/g, (line, from) => `__req('${from}')`)

  // Anything still importing is either a CDN URL or a form not handled above.
  const leftover = code.match(/^\s*import\s.+$/gm)
  if (leftover) {
    throw new Error(`${name}: unhandled import(s):\n  ${leftover.join('\n  ')}`)
  }

  // export function / async function / const / let / class
  code = code.replace(
    /^export\s+(async\s+function|function|const|let|class)\s+(\w+)/gm,
    (line, keyword, ident) => {
      exported.add(ident)
      return `${keyword} ${ident}`
    },
  )

  const stillExporting = code.match(/^\s*export\s.+$/gm)
  if (stillExporting) {
    throw new Error(`${name}: unhandled export(s):\n  ${stillExporting.join('\n  ')}`)
  }

  if (exported.size === 0) {
    throw new Error(`${name}: nothing exported — the module list is probably wrong`)
  }

  const returns = [...exported].map((n) => `    ${n},`).join('\n')

  return `__def('${name}', function (__req) {\n${code}\n  return {\n${returns}\n  }\n})`
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

const css = readFileSync(join(WEB, 'css', 'app.css'), 'utf8')

const factories = MODULES.map((name) => {
  const source = readFileSync(join(WEB, 'js', name), 'utf8')
  return transform(name, source)
}).join('\n\n')

/**
 * db.js picks its backend with a top-level `await import()`, which the registry
 * cannot express. The standalone build is always local, so the choice is made
 * here instead.
 */
const runtime = `
'use strict';
window.__ESC_SINGLE_FILE__ = true;

(function () {
  var __factories = {};
  var __cache = {};

  function __def(name, factory) { __factories[name] = factory }

  function __req(name) {
    if (__cache[name]) return __cache[name];
    var factory = __factories[name];
    if (!factory) throw new Error('Module not bundled: ' + name);
    // Seeded before running so a cycle sees a partially filled object rather
    // than recursing forever. This graph has none, but a future edit might.
    __cache[name] = {};
    var exports = factory(__req);
    Object.assign(__cache[name], exports);
    return __cache[name];
  }

${factories}

  // ---- Router -------------------------------------------------------------
  //
  // The three pages become three hash routes. Each view's markup is already in
  // the document; the router shows one and calls that view's init().

  var views = {
    register: { el: document.getElementById('view-register'), mod: 'register.js' },
    'new': { el: document.getElementById('view-new'), mod: 'form.js' },
    check: { el: document.getElementById('view-check'), mod: 'detail.js' },
  };

  function currentView() {
    var path = (window.location.hash || '').replace(/^#\\/?/, '').split('?')[0];
    var section = path.split('/')[0];
    if (section === 'new') return 'new';
    if (section === 'check') return 'check';
    return 'register';
  }

  var showing = null;

  var TITLES = {
    register: 'Safety check register — Electrical Safety Check',
    'new': 'New safety check — Electrical Safety Check',
    check: 'Certificate — Electrical Safety Check',
  };

  function route() {
    var name = currentView();

    Object.keys(views).forEach(function (key) {
      views[key].el.hidden = key !== name;
    });

    // Reset before init, because the certificate view replaces this with the
    // record's own reference and would otherwise leave it behind on the way out.
    document.title = TITLES[name];

    // Re-entering the register with a different search, or a different
    // certificate, has to re-run init even though the view has not changed.
    __req(views[name].mod).init();

    if (showing !== name) {
      showing = name;
      window.scrollTo(0, 0);
    }
  }

  window.addEventListener('hashchange', route);
  route();
})();
`

const html = `<!DOCTYPE html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Electrical Safety Check</title>
<meta name="description" content="Issue and archive Electrical Safety Check reports under the Residential Tenancies Regulations 2021.">
<style>
${css}
</style>
</head>
<body>

<header class="site-header no-print">
  <div class="site-header__inner">
    <a class="brand" href="#/">
      <span class="brand__name" data-organisation>Electrical Safety Check</span>
      <span class="brand__sub">Electrical Safety Check register</span>
    </a>
    <a class="btn btn--primary" href="#/new">New safety check</a>
  </div>
</header>

<main class="wrap stack">

  <div id="view-register" class="stack" hidden>
    <div class="toolbar">
      <div>
        <h1 class="page-title">Safety check register</h1>
        <p class="muted">Every certificate issued, newest inspection first.</p>
      </div>
      <form class="no-print" id="register-search">
        <input type="text" name="q" aria-label="Search the register"
               placeholder="Search address, electrician or licence">
        <button class="btn" type="submit">Search</button>
      </form>
    </div>
    <div id="results">
      <p class="muted">Loading the register…</p>
    </div>
  </div>

  <div id="view-new" hidden>
    <form id="safety-check" class="stack" novalidate>
      <p class="muted">Loading the form…</p>
    </form>
  </div>

  <div id="view-check" class="stack" hidden>
    <div id="certificate" class="stack">
      <p class="muted">Loading the certificate…</p>
    </div>
  </div>

</main>

<script src="${PDF_LIB_CDN}"></script>
<script>
${runtime}
</script>

</body>
</html>
`

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(OUT_FILE, html)

const kb = (html.length / 1024).toFixed(0)
console.log(`${OUT_FILE}`)
console.log(`${MODULES.length} modules, ${kb} KB`)
