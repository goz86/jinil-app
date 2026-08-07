const LOCK_KEY = 'jinil_app_lock_config';

export const APP_LOCK_CHANGED_EVENT = 'jinil_app_lock_changed';

function bytesToHex(bytes) {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function randomSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function hashPin(pin, salt) {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(digest));
}

function emitChanged() {
  window.dispatchEvent(new Event(APP_LOCK_CHANGED_EVENT));
}

export function getAppLockConfig() {
  try {
    const raw = window.localStorage.getItem(LOCK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.enabled || !parsed.salt || !parsed.pinHash) return null;
    return {
      enabled: true,
      salt: parsed.salt,
      pinHash: parsed.pinHash,
      failedAttempts: Number(parsed.failedAttempts || 0),
      lockedUntil: typeof parsed.lockedUntil === 'number' ? parsed.lockedUntil : null,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function hasAppLockPin() {
  return Boolean(getAppLockConfig()?.enabled);
}

export async function enableAppLock(pin) {
  const salt = randomSalt();
  const pinHash = await hashPin(pin, salt);
  const config = {
    enabled: true,
    salt,
    pinHash,
    failedAttempts: 0,
    lockedUntil: null,
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(LOCK_KEY, JSON.stringify(config));
  emitChanged();
  return true;
}

export async function verifyAppLockPin(pin) {
  const config = getAppLockConfig();
  if (!config) return false;

  if (config.lockedUntil && Date.now() < config.lockedUntil) return false;

  const nextHash = await hashPin(pin, config.salt);
  const ok = nextHash === config.pinHash;
  if (ok) {
    window.localStorage.setItem(LOCK_KEY, JSON.stringify({ ...config, failedAttempts: 0, lockedUntil: null }));
    emitChanged();
    return true;
  }

  const failedAttempts = config.failedAttempts + 1;
  const lockedUntil = failedAttempts >= 5 ? Date.now() + 30_000 : null;
  window.localStorage.setItem(LOCK_KEY, JSON.stringify({ ...config, failedAttempts, lockedUntil }));
  emitChanged();
  return false;
}

export async function disableAppLock(pin) {
  if (pin) {
    const ok = await verifyAppLockPin(pin);
    if (!ok) return false;
  }
  window.localStorage.removeItem(LOCK_KEY);
  emitChanged();
  return true;
}
