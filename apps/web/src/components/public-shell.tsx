import Link from "next/link";
import { Brand } from "@/components/brand";

export const supportEmail = "naheemhamdhan77@gmail.com";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return <div className="public-site">
    <a className="skip-link" href="#public-content">Skip to content</a>
    <header className="public-header"><div className="public-width public-header-inner">
      <Brand href="/" />
      <nav aria-label="Account"><Link href="/sign-in">Sign in</Link><Link className="button button-primary" href="/sign-up">Create account</Link></nav>
    </div></header>
    <main id="public-content" tabIndex={-1}>{children}</main>
    <footer className="public-footer"><div className="public-width"><Brand href="/" /><nav aria-label="Information">
      <Link href="/help">Help</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/contact">Contact</Link><Link href="/dashboard">Open studio</Link>
    </nav><p>An Education video learning preview. Review AI-generated content before sharing.</p></div></footer>
  </div>;
}

export function InformationPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return <PublicShell><article className="public-document public-width"><Link className="public-back" href="/">← Back to home</Link><h1>{title}</h1><p className="public-lead">{intro}</p><div className="public-document-body">{children}</div></article></PublicShell>;
}
