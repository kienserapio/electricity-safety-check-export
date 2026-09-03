/**
 * Small DOM helpers.
 *
 * Everything user-entered — addresses, electrician names, observations — is set
 * as text nodes rather than assembled into HTML strings, so a stray angle
 * bracket in an address is just an angle bracket.
 */

/** el('div', { class: 'card' }, ['text', childNode]) */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag)

  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue
    if (key === 'class') node.className = value
    else if (key === 'dataset') Object.assign(node.dataset, value)
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value)
    } else if (key === 'value') node.value = value
    else if (value === true) node.setAttribute(key, '')
    else node.setAttribute(key, String(value))
  }

  for (const child of [].concat(children)) {
    if (child == null || child === false) continue
    node.append(typeof child === 'string' || typeof child === 'number' ? String(child) : child)
  }

  return node
}

export function qs(selector, scope = document) {
  return scope.querySelector(selector)
}

/** Replaces everything inside `parent`. */
export function render(parent, ...children) {
  parent.replaceChildren(...children.flat().filter((c) => c != null && c !== false))
}

/**
 * True when running as the single-file build, which the bundler signals by
 * defining this flag before the app code.
 *
 * The three pages become three hash routes in one document, because a file
 * emailed to someone has to be one file. Everything else is identical.
 */
export const SINGLE_FILE =
  typeof window !== 'undefined' && window.__ESC_SINGLE_FILE__ === true

/** Splits `#/check/<id>` or `#/?q=term` into a path and its parameters. */
export function route() {
  const raw = window.location.hash.replace(/^#\/?/, '')
  const [path = '', query = ''] = raw.split('?')
  return { path, params: new URLSearchParams(query) }
}

/**
 * Reads a parameter from wherever this build keeps it — the query string for
 * the multi-page build, the hash for the single-file one.
 */
export function param(name) {
  if (!SINGLE_FILE) return new URLSearchParams(window.location.search).get(name)

  const { path, params } = route()
  if (name === 'id') {
    const [section, id] = path.split('/')
    return section === 'check' && id ? decodeURIComponent(id) : null
  }
  return params.get(name)
}

/**
 * A link to one of the three views, in whichever form this build uses.
 *
 * `page` is 'register', 'new' or 'check'.
 */
export function pageHref(page, { id, q } = {}) {
  if (SINGLE_FILE) {
    if (page === 'new') return '#/new'
    if (page === 'check') return `#/check/${encodeURIComponent(id)}`
    return q ? `#/?q=${encodeURIComponent(q)}` : '#/'
  }

  if (page === 'new') return 'new.html'
  if (page === 'check') return `check.html?id=${encodeURIComponent(id)}`
  return q ? `index.html?q=${encodeURIComponent(q)}` : 'index.html'
}

export function notice(message, action) {
  return el('div', { class: 'notice' }, [el('p', {}, message), action])
}

/**
 * The "this is not a record yet" banner.
 *
 * Shown on every page while certificates are kept in the browser. A demo that
 * looks exactly like the real thing is the one way this app could mislead
 * someone, so it says so plainly rather than quietly.
 */
export function storageBanner() {
  const warning = el('span', { hidden: true })

  const node = el('div', { class: 'banner no-print' }, [
    el('strong', {}, 'Browser storage.'),
    ' Certificates are saved in this browser only — not shared with anyone, not ' +
    'backed up, and erased if site data is cleared.',
    warning,
  ])

  /**
   * Called once the store finds it cannot reach IndexedDB, which happens on a
   * page opened straight off the disk. Says which tier it landed on, because
   * "saved somewhere smaller" and "not saved at all" are very different things
   * to be told after issuing a certificate.
   */
  node.noteFallback = (reason, persists) => {
    warning.hidden = false
    warning.replaceChildren(
      persists
        ? el('strong', {}, ' Using simple storage.')
        : el('strong', {}, ' Nothing is being saved.'),
      persists
        ? ` ${reason} Certificates are still kept, but only a handful fit. ` +
          'Opening the page through a web address rather than from a file lifts that.'
        : ` ${reason} Certificates will disappear when this tab closes. Open the ` +
          'page through a web address rather than from a file to keep them.',
    )
  }

  return node
}

/**
 * Puts exactly one storage banner at the top of `main`, and returns it.
 *
 * The single-file build keeps one `main` across all three views, so each view
 * asking for a banner would otherwise stack them up.
 */
export function ensureStorageBanner() {
  const main = qs('main')
  const existing = main.querySelector('.banner')
  if (existing) return existing

  const node = storageBanner()
  main.prepend(node)
  return node
}

/** A full-width error panel. Used when Supabase is unreachable or misconfigured. */
export function errorPanel(message) {
  return el('div', { class: 'alert', role: 'alert' }, [
    el('p', { class: 'alert__title' }, 'Something went wrong'),
    el('p', { class: 'alert__detail' }, message),
  ])
}
