import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
export default function NotFound() { return <PublicShell><div className="public-unavailable"><section><span className="public-unavailable-icon" aria-hidden="true">?</span><h1>This page isn’t available</h1><p>The link may be incorrect, or this item may no longer be available.</p><div className="public-actions"><Link className="button button-primary" href="/">Back to home</Link><Link className="button button-secondary" href="/help">Get help</Link></div></section></div></PublicShell>; }
