"use client";
import {SignOutAction} from "@/components/sign-out-action";
import {EducationProgressWorkspace} from '@/components/education-progress-workspace';
import {LiveVideoLibrary} from '@/components/live-video-library';
import {EducationResultPlayer} from '@/components/education-result';


import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { DisplayNameSchema, type UserDto } from "@contracts";
import { AppShell } from "@/components/app-shell";
import { TextField } from "@/components/form-fields";
import { Button, Notice } from "@/components/ui";
import { Icon } from "@/components/icons";
import { AccountError, accountRequest } from "@/lib/auth-browser";
import { LiveDashboard } from "@/components/live-dashboard";
import {SavedDrafts} from "@/components/saved-drafts";
import { DraftWorkspace } from "@/components/draft-workspace";

type Profile = {displayName:string;email:string;authMethods:string[];settingsVersion:number};
export function AccountWorkspace({settings=false,projectId,createMode,draftList=false,videoList=false,resultRevisionId,progressOnly=false}: {progressOnly?:boolean;settings?:boolean;projectId?:string;createMode?:string;draftList?:boolean;videoList?:boolean;resultRevisionId?:string}) {
  const router = useRouter();
  const [user,setUser] = useState<UserDto|null>(null);
  const [profile,setProfile] = useState<Profile|null>(null);
  const [error,setError] = useState("");
  const [backgroundError,setBackgroundError]=useState(false);
  const [checkingSession,setCheckingSession]=useState(false);
  const retrySession=useRef<(()=>void)|null>(null);
  const [reload,setReload] = useState(0);
  const verifiedUser=useRef<string|null>(null);
  const [processingLabel,setProcessingLabel]=useState("Checking processing status…");
  useEffect(()=>{
    let active=true,checking=false;
    const next=progressOnly&&projectId ? `/projects/${projectId}/progress` : resultRevisionId&&projectId ? `/projects/${projectId}/results/${resultRevisionId}` : videoList ? "/videos" : draftList ? "/drafts" : settings ? "/settings" : projectId ? `/projects/${projectId}` : createMode!==undefined ? "/projects/new" : "/dashboard";
    function expired() {
      if (!active) return;
      setUser(null);setProfile(null);
      router.replace(`${verifiedUser.current ? "/session-expired" : "/sign-in"}?next=${encodeURIComponent(next)}`);
    }
    function signedOutHere(){if(!active)return;active=false;setUser(null);setProfile(null);}
    function signedOut(){if(!active)return;signedOutHere();window.location.replace('/sign-in');}
    async function load(initial=true) {
      if(checking)return;checking=true;
      if(!initial)setCheckingSession(true);
      try {
        const session = await accountRequest("auth/session");
        if (!active) return;
        if (verifiedUser.current && verifiedUser.current!==session.user.id) {expired();return;}
        const data = initial && settings ? await accountRequest("me/settings") : null;
        if(active)setBackgroundError(false);
        if (active && initial) { verifiedUser.current=session.user.id;setUser(session.user); setProfile(data); }
      } catch(cause) {
        if (!active) return;
        if (cause instanceof AccountError && (cause.status===401 || (cause.status===403 && cause.code==="ACCOUNT_DISABLED"))) { expired(); return; }
        if(!initial){setBackgroundError(true);return;}
        setError(cause instanceof Error ? cause.message : "We couldn’t connect. Try again.");
      } finally {checking=false;if(active)setCheckingSession(false);}
    }
    retrySession.current=()=>{void load(false);};
    const check=()=>{if(document.visibilityState==="visible")void load(false);};
    const channel=typeof BroadcastChannel!=="undefined" ? new BroadcastChannel("account-session") : null;
    if(channel) channel.onmessage=event=>{if(event.data==='signed-out')signedOut();else check();};
    window.addEventListener('account-signed-out',signedOutHere);
    window.addEventListener("account-session-expired",expired);
    window.addEventListener("focus",check);document.addEventListener("visibilitychange",check);
    const timer=window.setInterval(check,60_000);
    void load(); return ()=>{active=false;retrySession.current=null;clearInterval(timer);channel?.close();window.removeEventListener('account-signed-out',signedOutHere);window.removeEventListener("account-session-expired",expired);window.removeEventListener("focus",check);document.removeEventListener("visibilitychange",check);};
  },[settings,reload,router,projectId,createMode,draftList,videoList,resultRevisionId,progressOnly]);
  if (error) return <main className="auth-page"><section className="auth-card"><Notice error>{error}</Notice><Button onClick={()=>{setError("");setReload(value=>value+1);}}>Try again</Button><Link href="/sign-in">Back to sign in</Link></section></main>;
  if (!user || (settings && !profile)) return <main className="auth-page"><p role="status">Loading your account…</p></main>;
  const drafting=!resultRevisionId&&(projectId!==undefined || createMode!==undefined);
  return <AppShell active={videoList||resultRevisionId||draftList ? "videos" : settings ? "settings" : drafting ? "create" : "dashboard"} identity={user} processingLabel={videoList || resultRevisionId || draftList || settings || drafting ? undefined : processingLabel}>
    {backgroundError && <Notice tone="warning" onRetry={()=>retrySession.current?.()} retrying={checkingSession}>We could not check your session. Your unsaved changes are still here. Check your connection and try again.</Notice>}
    {progressOnly&&projectId ? <EducationProgressWorkspace projectId={projectId}/> : settings && profile ? <ProfileSettings initial={profile} onSave={name=>setUser({...user,displayName:name})} /> : videoList ? <LiveVideoLibrary/> : resultRevisionId&&projectId ? <div className="result-library-page"><Link className="generation-back" href="/videos">Back to My videos</Link><EducationResultPlayer projectId={projectId} revisionId={resultRevisionId}/></div> : draftList ? <SavedDrafts/> : drafting ? <DraftWorkspace key={projectId??createMode??"new"} projectId={projectId} selectedMode={createMode}/> : <LiveDashboard displayName={user.displayName} onProcessingStatus={setProcessingLabel}/>}
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
    <section className="settings-panel ui-panel"><div className="settings-panel-heading"><h2>Session</h2></div><SignOutAction/><p className="account-intro">Signing out doesn’t cancel generation already in progress.</p></section>
    <section className="settings-panel ui-panel delete-account-panel"><div className="settings-panel-heading"><h2>Delete account</h2><p>Permanently delete your account, projects and stored media.</p></div><Button variant="danger" disabled aria-describedby="deletion-coming">Delete account</Button><p id="deletion-coming" className="account-intro">Account deletion isn’t available in this version yet.</p></section>
  </div>;
}
