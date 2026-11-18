import Link from "next/link";
import { AuthFrame } from "@/components/auth-form";
import { Notice } from "@/components/ui";
export const metadata = {title:"Account access help"};
export default function AccountAccessPage() { return <AuthFrame><header className="auth-heading"><h1>Forgot your password?</h1><p>Password-reset emails aren’t available in this version.</p></header><Notice>If you signed up with email and password, check your password manager or saved passwords. We can’t send a reset link.</Notice><p><Link href="/help">Read the help guide</Link> or <Link href="/contact">contact the creator</Link>. Do not send your password.</p><Link className="button button-primary" href="/sign-in">Back to sign in</Link></AuthFrame>; }
