"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { DisplayNameSchema, type UserDto } from "@contracts";
import { AppShell } from "@/components/app-shell";
import { TextField } from "@/components/form-fields";
import { Button, Notice } from "@/components/ui";
import { Icon } from "@/components/icons";
import { AccountError, accountRequest } from "@/lib/auth-browser";

type Profile = {displayName:string;email:string;authMethods:string[];settingsVersion:number};
export function AccountWorkspace({settings=false}: {settings?:boolean}) {
  const router = useRouter();
  const [user,setUser] = useState<UserDto|null>(null);
  const [profile,setProfile] = useState<Profile|null>(null);
  const [error,setError] = useState("");
  const [reload,setReload] = useState(0);
  useEffect(()=>{
    let active=true;
    async function load() {
      try {
        const session = await accountRequest("auth/session");
        const data = settings ? await accountRequest("me/settings") : null;
        if (active) { setUser(session.user); setProfile(data); }
      } catch(cause) {
        if (!active) return;
        if (cause instanceof AccountError && cause.status===401) { router.replace("/sign-in"); return; }
        setError(cause instanceof Error ? cause.message : "We couldn’t connect. Try again.");
      }
    }
    void load(); return ()=>{active=false;};
  },[settings,reload,router]);
  if (error) return <main className="auth-page"><section className="auth-card"><Notice error>{error}</Notice><Button onClick={()=>{setError("");setReload(value=>value+1);}}>Try again</Button><Link href="/sign-in">Back to sign in</Link></section></main>;
  if (!user || (settings && !profile)) return <main className="auth-page"><p role="status">Loading your account…</p></main>;
  return <AppShell active={settings ? "settings" : "dashboard"} identity={user}>
    {settings && profile ? <ProfileSettings initial={profile} onSave={name=>setUser({...user,displayName:name})} /> : <div className="settings-page"><div className="settings-heading"><p className="eyebrow">Your account</p><h1>Welcome, {user.displayName}</h1><p>You’re signed in to AI Video Studio.</p></div><section className="settings-panel ui-panel"><h2>Your studio is taking shape</h2><p className="account-intro">Your account is connected. Project data and video generation will be connected in the next milestones.</p><Link className="button button-primary" href="/settings">Manage your profile</Link><p className="account-intro"><Link className="account-inline-link" href="/preview/dashboard">View the dashboard design preview</Link></p></section></div>}
  </AppShell>;
}
function ProfileSettings({initial,onSave}: {initial:Profile;onSave:(name:string)=>void}) {
  const [profile,setProfile] = useState(initial); const [name,setName] = useState(initial.displayName);
  const [pending,setPending] = useState(false); const [message,setMessage] = useState(""); const [error,setError] = useState(""); const [conflict,setConflict] = useState(false);
  const [touched,setTouched] = useState(false); const saving = useRef(false);
  const valid = DisplayNameSchema.safeParse(name).success;
  async function save(event:FormEvent) {
    event.preventDefault(); setTouched(true); if (!valid || saving.current) return;
    saving.current=true; setPending(true); setError(""); setMessage("");
    try {
      const data = await accountRequest("me/settings",{method:"PATCH",body:{displayName:name,expectedVersion:profile.settingsVersion}});
      setProfile({...profile,...data}); setName(data.displayName); setConflict(false); onSave(data.displayName); setMessage("Your full name has been saved.");
    } catch(cause) { setError(cause instanceof Error ? cause.message : "We couldn’t connect. Try again."); if(cause instanceof AccountError && cause.status===409) setConflict(true); }
    finally { saving.current=false;setPending(false); }
  }
  async function reloadSaved() {
    if(saving.current) return;
    saving.current=true;setPending(true);setError("");setMessage("");
    try { const data = await accountRequest("me/settings");setProfile(data);setName(data.displayName);onSave(data.displayName);setConflict(false);setMessage("The latest saved profile has been loaded."); }
    catch(cause) {setError(cause instanceof Error ? cause.message : "We couldn’t load your profile.");}
    finally {saving.current=false;setPending(false);}
  }
  return <div className="settings-page"><div className="settings-heading"><p className="eyebrow">Account &amp; preferences</p><h1>Settings</h1><p>Manage your profile and account security.</p></div>
    <section className="settings-panel ui-panel" aria-labelledby="real-profile-title"><div className="settings-panel-heading"><h2 id="real-profile-title">Profile</h2><p>Your personal identity inside AI Video Studio workspaces.</p></div><form onSubmit={save} noValidate>
      <TextField className="settings-field" label="Full name" autoComplete="name" maxLength={160} value={name} disabled={pending} onBlur={()=>setTouched(true)} onChange={e=>{setName(e.target.value);setMessage("");}} hint="Used as your account display name." error={touched && !valid ? "Enter a full name of 1–80 characters." : undefined} />
      <TextField className="settings-field" label={<>Email <span className="fixed-label"><Icon name="lock" width="12" height="12"/>Fixed</span></>} value={profile.email} readOnly hint="Email changes aren’t available in this version." />
      <div className="settings-save"><Button type="submit" pending={pending} pendingLabel="Saving…" disabled={!valid || name.trim()===profile.displayName || conflict}><Icon name="check"/>Save changes</Button><span>Saves full name only</span></div>
      {message && <Notice tone="success">{message}</Notice>}{error && <Notice error>{error}</Notice>}{conflict && <Button variant="secondary" pending={pending} onClick={reloadSaved}>Reload saved profile (replaces your edits)</Button>}
    </form></section>
    <section className="settings-panel ui-panel"><div className="settings-panel-heading"><h2>Account security</h2><p>Credentials and access safeguards for your account.</p></div><div className="settings-security-row"><div className="security-method"><span className="settings-icon"><Icon name="key"/></span><p>Sign-in method: Email and password</p></div><Button variant="secondary" disabled aria-describedby="password-coming">Change password</Button></div><p id="password-coming" className="account-intro">Password changes will be connected in a later milestone.</p><p className="settings-help"><Icon name="info"/>Password-reset emails aren’t available in this version. Keep your password somewhere safe.</p></section>
    <section className="settings-panel ui-panel"><div className="settings-panel-heading"><h2>Session</h2></div><Button variant="secondary" disabled aria-describedby="session-coming">Sign out</Button><p id="session-coming" className="account-intro">Sign out isn’t available in this local preview yet.</p></section>
    <section className="settings-panel ui-panel delete-account-panel"><div className="settings-panel-heading"><h2>Delete account</h2><p>Permanently delete your account, projects and stored media.</p></div><Button variant="danger" disabled aria-describedby="deletion-coming">Delete account</Button><p id="deletion-coming" className="account-intro">Account deletion isn’t available in this version yet.</p></section>
  </div>;
}
