// Lightweight admin auth. If ADMIN_PASSWORD is unset (typical local dev), the
// gate is disabled and everything stays open. When it is set (production), the
// admin pages and mutating API routes require a valid session cookie.

export const SESSION_COOKIE = "vlu_admin";
const SALT = "valorant-lineups::v1";

export function adminAuthEnabled(): boolean {
  return !!process.env.ADMIN_PASSWORD;
}

/** Derive the opaque session token stored in the cookie for a given password. */
export async function sessionTokenFor(password: string): Promise<string> {
  const data = new TextEncoder().encode(`${SALT}:${password}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** The token a valid cookie must equal, or null when auth is disabled. */
export async function expectedToken(): Promise<string | null> {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  return sessionTokenFor(pw);
}
