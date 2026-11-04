import Link from "next/link";
import { AuthFrame } from "@/components/auth-form";
import { Notice } from "@/components/ui";
export const metadata = {title:"Account access help"};
export default function AccountAccessPage() { return <AuthFrame><header className="auth-heading"><h1>Forgot your password?</h1><p>Password-reset emails aren’t available in this version.</p></header><Notice>If you signed up with email and password, check your password manager or saved passwords. We can’t send a reset link.</Notice><div className="auth-heading"><p>If you created your account with Google, use Google’s account recovery. Google sign-in isn’t a recovery method for a separate email-and-password account.</p></div><Link className="button button-primary" href="/sign-in">Back to sign in</Link></AuthFrame>; }
