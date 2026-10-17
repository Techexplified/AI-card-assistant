/* global window */

/** Build a clean, absolute Power-Up URL before asking Trello to sign it. */
export function signPowerUpUrl(t, path) {
  const destination = new URL(path, window.location.href);
  destination.hash = '';

  if (t && typeof t.signUrl === 'function') {
    return t.signUrl(destination.href);
  }

  destination.search = window.location.search;
  return destination.href;
}
