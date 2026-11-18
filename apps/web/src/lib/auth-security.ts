import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const CSRF_LIFETIME = 30 * 60;
export const csrfCookieName = (secure: boolean) => secure ? "__Host-studio-csrf" : "studio-csrf";
export function sessionFingerprint(cookies: { name: string; value: string }[]) {
  return createHash("sha256").update(JSON.stringify(cookies.filter(c => /^sb-.*-auth-token(?:\.\d+)?$/.test(c.name)).sort((a,b) => a.name.localeCompare(b.name)))).digest("hex");
}
export function issueCsrf(binding: string, now = Date.now()) {
  return `${now}.${randomBytes(32).toString("hex")}.${binding}`;
}
export function validCsrf(cookie: string | undefined, header: string | null, binding: string, now = Date.now()) {
  if (!cookie || !header || cookie.length !== header.length || !/^\d{13}\.[a-f0-9]{64}\.[a-f0-9]{64}$/.test(cookie) || !/^\d{13}\.[a-f0-9]{64}\.[a-f0-9]{64}$/.test(header)) return false;
  const [created,, fingerprint] = cookie.split(".");
  return timingSafeEqual(Buffer.from(cookie),Buffer.from(header)) && fingerprint === binding && Number(created) <= now && now - Number(created) < CSRF_LIFETIME * 1000;
}
