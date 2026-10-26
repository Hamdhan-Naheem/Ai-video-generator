import Link from "next/link";
import { Brand } from "@/components/brand";
import { Icon } from "@/components/icons";
import { navigation, type Section } from "@/lib/navigation";

function Navigation({ active, mobile = false }: { active: Section; mobile?: boolean }) {
  return <nav className={mobile ? "mobile-nav" : "desktop-nav"} aria-label={mobile ? "Mobile navigation" : "Main navigation"}>
    {navigation.map((item) => <Link key={item.key} className="nav-link" href={item.href} aria-current={item.key === active ? "page" : undefined}>
      <Icon name={item.icon} /><span>{item.label}</span>
    </Link>)}
  </nav>;
}

export function AppShell({ active, children }: { active: Section; children: React.ReactNode }) {
  return <div className="app-frame">
    <a href="#main-content" className="skip-link">Skip to content</a>
    <aside className="sidebar">
      <Brand />
      <Navigation active={active} />
      <div className="sidebar-footer"><span className="account-mark" aria-hidden="true">AM</span><div><p>Alex Morgan</p><small>Sample profile</small></div><span className="profile-chevron" aria-hidden="true">⌄</span></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div className="mobile-brand"><Brand /></div><span className="desktop-context">{active === "dashboard" ? "Workspace studio" : <>AI Video Studio <span aria-hidden="true">/</span>{navigation.find(item => item.key === active)?.label}</>}</span><span className="mobile-profile account-mark" aria-label="Alex Morgan, sample profile">AM</span><span className="processing-badge" aria-label="Processing available, sample status"><span className="status-dot" />Processing available <small>Sample</small></span></header><div className="mobile-availability"><span className="status-dot" />Processing available <span>· Sample</span></div>
      <main id="main-content" tabIndex={-1} className="main-content">{children}</main>
    </div>
    <Navigation active={active} mobile />
  </div>;
}
