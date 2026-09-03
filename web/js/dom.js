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

/** Reads `?name=` from the current URL. */
export function param(name) {
  return new URLSearchParams(window.location.search).get(name)
}

export function notice(message, action) {
  return el('div', { class: 'notice' }, [el('p', {}, message), action])
}

/** A full-width error panel. Used when Supabase is unreachable or misconfigured. */
export function errorPanel(message) {
  return el('div', { class: 'alert', role: 'alert' }, [
    el('p', { class: 'alert__title' }, 'Something went wrong'),
    el('p', { class: 'alert__detail' }, message),
  ])
}
