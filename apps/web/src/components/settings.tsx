"use client";

import { useState, type FormEvent } from "react";
import { Icon } from "@/components/icons";
import { Button, Modal, Notice, PreviewNote } from "@/components/ui";

export function Settings() {
  const [name, setName] = useState("Alex Morgan");
  const [previewName, setPreviewName] = useState("Alex Morgan");
  const [message, setMessage] = useState("");
  const [touched, setTouched] = useState(false);
  const [dialog, setDialog] = useState<"password" | "signout" | "delete" | null>(null);
  const valid = name.trim().length > 0 && name.trim().length <= 80;
  const changed = name.trim() !== previewName;
  function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setTouched(true); if (valid && changed) { setPreviewName(name.trim()); setName(name.trim()); setMessage("Sample name updated for this page only. Account saving is not connected; refreshing restores the sample."); } }
  return <div className="settings-page">
    <div className="settings-heading"><p className="eyebrow">Account &amp; preferences</p><h1>Settings</h1><p>Manage your profile and account security.</p></div>
    <section className="settings-panel ui-panel" aria-labelledby="profile-title"><div className="settings-panel-heading"><h2 id="profile-title">Profile</h2><p>Your personal identity inside AI Video Studio workspaces.</p></div><form onSubmit={save} noValidate>
      <div className="settings-field"><label htmlFor="profile-name">Full name</label><input id="profile-name" autoComplete="name" maxLength={80} value={name} aria-invalid={touched && !valid} aria-describedby={touched && !valid ? "profile-name-error" : "profile-name-hint"} onBlur={() => setTouched(true)} onChange={event => { setName(event.target.value); setMessage(""); }} /><p id="profile-name-hint">Used as your account display name.</p>{touched && !valid && <p id="profile-name-error" className="field-error" role="alert">Enter a full name of 1–80 characters.</p>}</div>
      <div className="settings-field"><label htmlFor="profile-email">Email <span className="fixed-label"><Icon name="lock" width="12" height="12" />Fixed</span></label><div className="readonly-field"><input id="profile-email" value="alex@example.com" readOnly aria-describedby="profile-email-hint" /><Icon name="lock" width="16" height="16" /></div><p id="profile-email-hint">Email changes aren’t available in this version.</p></div>
      <div className="settings-save"><Button type="submit" disabled={!changed || !valid}><Icon name="check" width="17" height="17" />Save changes</Button><span>Saves full name only</span></div>{message && <Notice>{message}</Notice>}
    </form></section>
    <section className="settings-panel ui-panel" aria-labelledby="security-title"><div className="settings-panel-heading"><h2 id="security-title">Account security</h2><p>Credentials and access safeguards for your account.</p></div><div className="settings-security-row"><div className="security-method"><span className="settings-icon"><Icon name="key" /></span><div><p>Sign-in method: Email and password</p><small>You’ll need your current password.</small></div></div><Button variant="secondary" onClick={() => setDialog("password")}><Icon name="key" width="17" height="17" />Change password</Button></div><p className="settings-help"><Icon name="info" width="16" height="16" />Password-reset emails aren’t available in this version. Keep your password somewhere safe.</p></section>
    <section className="settings-panel ui-panel" aria-labelledby="session-title"><div className="settings-panel-heading"><h2 id="session-title">Session</h2><p>Manage your active authentication token on this device.</p></div><div className="session-row"><div><p>Current active session</p><small>Signing out doesn’t cancel generation already in progress.</small></div><Button variant="secondary" onClick={() => setDialog("signout")}><Icon name="signout" width="17" height="17" />Sign out</Button></div></section>
    <section className="settings-panel ui-panel delete-account-panel" aria-labelledby="delete-title"><div className="settings-panel-heading"><h2 id="delete-title">Delete account</h2><p>Permanently delete your account, projects and stored media.</p></div><div className="session-row"><p>Once confirmed, this step is permanent and unrecoverable. Account details and project files cannot be restored.</p><Button variant="danger" onClick={() => setDialog("delete")}><Icon name="trash" width="16" height="16" />Delete account</Button></div></section>
    <PreviewNote>Sample profile and email/password layout. No account or active session is connected.</PreviewNote>
    <Modal open={dialog !== null} onClose={() => setDialog(null)} title={dialog === "password" ? "Change password" : dialog === "signout" ? "Sign out?" : "Delete your account?"}>
      <p className="dialog-description">{dialog === "password" ? "Password changes will require your current password once account integration is available." : dialog === "signout" ? "Signing out will end your session on this device. Jobs already in progress will continue." : "Deletion will permanently remove your account, projects, uploaded files and generated media after identity confirmation."}</p>
      <Notice>This is a design preview with sample data. No account action can be submitted here.</Notice><div className="dialog-actions"><Button variant="secondary" data-initial-focus onClick={() => setDialog(null)}>Cancel</Button><Button variant={dialog === "delete" ? "danger" : "primary"} disabled>{dialog === "password" ? "Update password" : dialog === "signout" ? "Sign out" : "Delete account"}</Button></div>
    </Modal>
  </div>;
}
