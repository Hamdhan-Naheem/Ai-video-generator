import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { UserDtoSchema } from "@contracts";
import type { Database } from "../../../../shared/database/database.types";

export function authConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  const origin = process.env.APP_ORIGIN;
  if (!url || !key || !origin) throw new Error("AUTH_CONFIGURATION_MISSING");
  const app = new URL(origin);
  const local = ["127.0.0.1", "localhost"].includes(app.hostname);
  if (app.origin !== origin || (!local && app.protocol !== "https:") || app.username || app.password) throw new Error("AUTH_CONFIGURATION_INVALID");
  return { url, key, origin, secure: app.protocol === "https:" };
}
export async function authClient() {
  const {url,key,secure} = authConfig();
  const jar = await cookies();
  return createServerClient<Database>(url,key,{
    cookieOptions: { path: "/", sameSite: "lax", secure },
    global: { fetch: (input,init) => fetch(input,{...init,cache:"no-store",signal:AbortSignal.timeout(30_000)}) },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: values => { for (const {name,value,options} of values) jar.set(name,value,options); },
    },
  });
}
export type AuthClient = Awaited<ReturnType<typeof authClient>>;
export async function ownedProfile(client: AuthClient, user: User) {
  const {data,error} = await client.from("profiles").select("id,display_name,role,status,settings_version").eq("id",user.id).single();
  if (error || !data || data.status !== "active") return null;
  const authMethods = [...new Set((user.identities ?? []).map(identity => identity.provider === "email" ? "password" : identity.provider).filter((method): method is "password" | "google" => method === "password" || method === "google"))];
  const dto = UserDtoSchema.safeParse({id:user.id,displayName:data.display_name,email:user.email,role:data.role,authMethods,emailOwnership:"unknown"});
  return dto.success ? {user:dto.data,settingsVersion:data.settings_version} : null;
}
