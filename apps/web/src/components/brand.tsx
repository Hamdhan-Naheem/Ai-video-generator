import Link from "next/link";

export function Brand({href="/preview/dashboard"}: {href?:string}) {
  return <Link className="brand" href={href} aria-label={href === "/preview/dashboard" ? "AI Video Studio — preview dashboard" : "AI Video Studio"}>
    <span className="brand-mark" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M5 3.5 12 8l-7 4.5Z" fill="currentColor" /></svg></span>
    <span>AI Video Studio</span>
  </Link>;
}
