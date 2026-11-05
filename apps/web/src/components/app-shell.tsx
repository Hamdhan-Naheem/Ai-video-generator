import Link from "next/link";
import type { UserDto } from "@contracts";
import { Brand } from "@/components/brand";
import { Icon } from "@/components/icons";
import { navigation, type Section } from "@/lib/navigation";

function Navigation({active,mobile=false,live=false}: {active:Section;mobile?:boolean;live?:boolean}) {
  return <nav className={mobile ? "mobile-nav" : "desktop-nav"} aria-label={mobile ? "Mobile navigation" : "Main navigation"}>
    {navigation.map(item=><Link key={item.key} className="nav-link" href={live && item.key==="create" ? "/projects/new" : live && (item.key === "dashboard" || item.key === "settings") ? `/${item.key}` : item.href} aria-current={item.key===active ? "page" : undefined}><Icon name={item.icon}/><span>{item.label}</span></Link>)}
  </nav>;
}
export function AppShell({active,children,identity,processingLabel="Generation not connected"}: {active:Section;children:React.ReactNode;identity?:UserDto;processingLabel?:string}) {
  const initials=identity ? [...identity.displayName].slice(0,2).join("").toUpperCase() : "AM";
  return <div className="app-frame">
    <a href="#main-content" className="skip-link">Skip to content</a>
    <aside className="sidebar">
      <Brand href={identity ? "/dashboard" : undefined}/>
      <Navigation active={active} live={!!identity}/>
      <div className="sidebar-footer"><span className="account-mark" aria-hidden="true">{initials}</span><div><p>{identity?.displayName ?? "Alex Morgan"}</p><small>{identity ? "Your account" : "Sample profile"}</small></div><span className="profile-chevron" aria-hidden="true">⌄</span></div>
    </aside>
    <div className="workspace">
      <header className="topbar">
        <div className="mobile-brand"><Brand href={identity ? "/dashboard" : undefined}/></div>
        <span className="desktop-context">{active==="dashboard" ? "Workspace studio" : <>AI Video Studio <span aria-hidden="true">/</span>{navigation.find(item=>item.key===active)?.label}</>}</span>
        <span className="mobile-profile account-mark" aria-label={identity ? identity.displayName : "Alex Morgan, sample profile"}>{initials}</span>
        {identity ? <span className="processing-badge">{processingLabel}</span> : <span className="processing-badge" aria-label="Processing available, sample status"><span className="status-dot"/>Processing available <small>Sample</small></span>}
      </header>
      <div className="mobile-availability">{identity ? processingLabel : <><span className="status-dot"/>Processing available <span>· Sample</span></>}</div>
      <main id="main-content" tabIndex={-1} className="main-content">{children}</main>
    </div>
    <Navigation active={active} mobile live={!!identity}/>
  </div>;
}
