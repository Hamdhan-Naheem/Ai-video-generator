"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { EmailSchema, DisplayNameSchema, NewPasswordSchema, CurrentPasswordSchema, LIMITS } from "@contracts";
import { Brand } from "@/components/brand";
import { TextField, PasswordField } from "@/components/form-fields";
import { Button, Notice } from "@/components/ui";
import { accountRequest } from "@/lib/auth-browser";

export function AuthFrame({children}: {children:React.ReactNode}) {
  return <main className="auth-page"><section className="auth-card"><Brand href="/sign-in" />{children}</section></main>;
}
export function AuthForm({signup=false,nextPath="/dashboard"}: {signup?:boolean;nextPath?:string}) {
  const router = useRouter();
  const [name,setName] = useState(""); const [email,setEmail] = useState("");
  const [password,setPassword] = useState(""); const [confirm,setConfirm] = useState("");
  const [touched,setTouched] = useState<Record<string,boolean>>({});
  const [pending,setPending] = useState(false); const [error,setError] = useState("");
  const submitting = useRef(false);
  const validName = !signup || DisplayNameSchema.safeParse(name).success;
  const validEmail = EmailSchema.safeParse(email).success;
  const validPassword = (signup ? NewPasswordSchema : CurrentPasswordSchema).safeParse(password).success;
  const validConfirm = !signup || (confirm.length > 0 && password === confirm);
  const touch = (field:string) => setTouched(old => ({...old,[field]:true}));
  async function submit(event:FormEvent) {
    event.preventDefault(); setTouched({name:true,email:true,password:true,confirm:true});
    if (!validName || !validEmail || !validPassword || !validConfirm || submitting.current) return;
    submitting.current=true; setPending(true); setError("");
    try {
      const body = signup ? {email,password,displayName:name} : {email,password};
      await accountRequest(signup ? "auth/sign-up" : "auth/sign-in",{method:"POST",body});
      setPassword(""); setConfirm(""); router.replace(signup ? "/dashboard" : nextPath); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "We couldn’t connect. Please try again."); }
    finally { submitting.current=false; setPending(false); }
  }
  return <AuthFrame>
    <header className="auth-heading"><h1>{signup ? "Create an account" : "Welcome back"}</h1><p>{signup ? "Create narrated videos and keep your projects in one place." : "Sign in to create videos and access your projects."}</p></header>
    {error && <Notice error>{error}</Notice>}
    <form className="auth-form" onSubmit={submit} noValidate aria-busy={pending}>
      {signup && <TextField label="Full name" name="displayName" autoComplete="name" placeholder="Alex Morgan" maxLength={LIMITS.displayName*2} value={name} disabled={pending} onChange={e=>setName(e.target.value)} onBlur={()=>touch("name")} error={touched.name && !validName ? "Enter a full name of 1–80 characters." : undefined} />}
      <TextField label="Email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="you@example.com" maxLength={LIMITS.email} value={email} disabled={pending} onChange={e=>setEmail(e.target.value)} onBlur={()=>touch("email")} error={touched.email && !validEmail ? "Enter a valid email address." : undefined} />
      <div>{!signup && <Link className="auth-access-link" href="/account-access">Forgot password?</Link>}<PasswordField label="Password" name="password" autoComplete={signup ? "new-password" : "current-password"} maxLength={LIMITS.passwordMax} value={password} disabled={pending} onChange={e=>setPassword(e.target.value)} onBlur={()=>touch("password")} hint={signup ? "Use 12–128 characters and a unique password. A password manager can help." : undefined} error={touched.password && !validPassword ? (signup ? "Use 12–128 characters." : "Enter your password.") : undefined} /></div>
      {signup && <PasswordField label="Confirm password" name="confirmPassword" autoComplete="new-password" maxLength={LIMITS.passwordMax} value={confirm} disabled={pending} onChange={e=>setConfirm(e.target.value)} onBlur={()=>touch("confirm")} error={touched.confirm && !validConfirm ? "Passwords don’t match." : undefined} />}
      {signup && <Notice>Email password recovery isn’t available in this version. Keep your password somewhere safe.</Notice>}
      <Button type="submit" pending={pending} pendingLabel={signup ? "Creating account…" : "Signing in…"} disabled={!validName || !validEmail || !validPassword || !validConfirm}>{signup ? "Create account" : "Sign in"}</Button>
    </form>
    <p className="auth-switch">{signup ? "Already have an account? " : "Don’t have an account? "}<Link href={signup ? "/sign-in" : "/sign-up"}>{signup ? "Sign in" : "Sign up"}</Link></p>
  </AuthFrame>;
}
