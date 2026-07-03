import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, adminAuthEnabled, expectedToken } from "./auth";

/**
 * Whether the current request is allowed to create/edit/delete content.
 * When ADMIN_PASSWORD is unset (local dev) the gate is off and this is always
 * true. In production it requires a valid admin session cookie.
 */
export async function canManage(): Promise<boolean> {
  if (!adminAuthEnabled()) return true;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const expected = await expectedToken();
  return !!token && !!expected && token === expected;
}
