/**
 * appLock.ts — local PIN gate for the app.
 *
 * The PIN itself is never stored. On set-up we generate a random 16-byte salt
 * and derive a key with PBKDF2-SHA256 (210,000 iterations, the OWASP 2023
 * floor for this algorithm); only the salt and the derived hash are persisted.
 * Verification re-derives and compares in constant time.
 *
 * This is a local convenience lock, not disk encryption — anyone with physical
 * access and a rooted device can still read app storage. It exists so a phone
 * handed to someone for a moment does not expose relapse history and journals.
 *
 * Deliberately NOT biometric: no BiometricPrompt plugin is installed, so the
 * app does not claim biometrics or request the USE_BIOMETRIC permission.
 *
 * Requires a secure context for crypto.subtle. Capacitor serves the app over
 * the https:// scheme on Android, and dev runs on localhost, so both qualify.
 */

const PBKDF2_ITERATIONS = 210_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

/** Unlocked state lives in memory only — it never survives a process restart. */
let unlockedThisSession = false;

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const fromHex = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
};

/** True when the platform can actually derive keys. */
export const isCryptoAvailable = (): boolean =>
  typeof crypto !== 'undefined' && typeof crypto.subtle?.deriveBits === 'function';

/** Derives the PBKDF2 hash of `pin` against `saltHex`, returned as hex. */
const derive = async (pin: string, saltHex: string): Promise<string> => {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: fromHex(saltHex) as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    KEY_BITS
  );

  return toHex(bits);
};

/** Length-independent, timing-safe string comparison. */
const constantTimeEquals = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
};

export interface PinCredentials {
  pinHash: string;
  pinSalt: string;
}

/**
 * Creates the stored credential pair for a new PIN.
 * Throws if the platform has no WebCrypto — callers must surface that rather
 * than silently storing a plaintext fallback.
 */
export const createPinCredentials = async (pin: string): Promise<PinCredentials> => {
  if (!isCryptoAvailable()) {
    throw new Error('Secure storage is unavailable on this device, so a PIN cannot be set.');
  }
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const pinSalt = toHex(salt.buffer);
  return { pinHash: await derive(pin, pinSalt), pinSalt };
};

/** Verifies `pin` against stored credentials. */
export const verifyPin = async (
  pin: string,
  credentials: Partial<PinCredentials> | undefined
): Promise<boolean> => {
  if (!credentials?.pinHash || !credentials.pinSalt || !isCryptoAvailable()) return false;
  try {
    const candidate = await derive(pin, credentials.pinSalt);
    const ok = constantTimeEquals(candidate, credentials.pinHash);
    if (ok) unlockedThisSession = true;
    return ok;
  } catch {
    return false;
  }
};

/** Whether the current session has already been unlocked. */
export const isUnlocked = (): boolean => unlockedThisSession;

/** Marks the session unlocked — used right after the user sets a new PIN. */
export const markUnlocked = (): void => {
  unlockedThisSession = true;
};

/** Re-locks the app, e.g. after a long time in the background. */
export const lock = (): void => {
  unlockedThisSession = false;
};

/** Basic PIN policy: 4–8 digits, and not a single repeated digit. */
export const validatePinFormat = (pin: string): string | null => {
  if (!/^\d{4,8}$/.test(pin)) return 'Your PIN must be 4 to 8 digits.';
  if (/^(\d)\1+$/.test(pin)) return 'Choose a PIN that is not the same digit repeated.';
  return null;
};
