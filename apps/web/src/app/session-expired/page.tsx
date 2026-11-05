import Link from "next/link";
import { AuthFrame } from "@/components/auth-form";
import { Notice } from "@/components/ui";
import { safeAccountReturn } from "@/lib/auth-return";
export const metadata={title:"Please sign in again"};
export default async function SessionExpiredPage({searchParams}: {searchParams:Promise<{next?:string}>}) {
  const next=safeAccountReturn((await searchParams).next);
  return <AuthFrame><header className="auth-heading"><h1>Please sign in again</h1><p>Your session has expired. Sign in to continue.</p></header><Notice>Generation already in progress continues while you’re signed out. Unsaved changes haven’t been submitted again.</Notice><Link className="button button-primary" href={`/sign-in?next=${encodeURIComponent(next)}`}>Sign in</Link></AuthFrame>;
}
