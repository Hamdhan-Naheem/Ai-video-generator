import type { SVGProps } from "react";

export type IconName = "dashboard" | "plus-circle" | "videos" | "settings" | "arrow-right" | "check" | "layout" | "plus" | "play" | "play-circle" | "clock" | "edit" | "info" | "close" | "arrow-left" | "layers" | "captions" | "more" | "lock" | "key" | "signout" | "trash";

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    {name === "dashboard" && <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>}
    {name === "plus-circle" && <><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>}
    {name === "videos" && <><path d="M4 7v14h14" /><rect x="7" y="3" width="14" height="14" rx="2" /><path d="m12 7 5 3-5 3Z" /></>}
    {name === "settings" && <><path d="m9 3-.5 2-2 1.2-2-.6-2 3.5 1.5 1.4v3L2.5 15l2 3.5 2-.6 2 1.2.5 2h4l.5-2 2-1.2 2 .6 2-3.5-1.5-1.4v-3L20 9l-2-3.5-2 .6-2-1.2-.5-2Z" /><circle cx="11.3" cy="12" r="3" /></>}
    {name === "arrow-right" && <path d="M4 12h16m-6-6 6 6-6 6" />}
    {name === "plus" && <path d="M12 5v14M5 12h14" />}
    {name === "play" && <path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="none" />}
    {name === "play-circle" && <><circle cx="12" cy="12" r="9" /><path d="m10 8 6 4-6 4Z" /></>}
    {name === "clock" && <><circle cx="12" cy="12" r="9" /><path d="M12 6v6l4 2" /></>}
    {name === "edit" && <><path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 15Z" /></>}
    {name === "info" && <><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10v.1" /></>}
    {name === "close" && <path d="m6 6 12 12M6 18 18 6" />}
    {name === "arrow-left" && <path d="M20 12H4m6-6-6 6 6 6" />}
    {name === "layers" && <><path d="m12 3 9 6-9 6-9-6Z" /><path d="m3 14 9 6 9-6" /></>}
    {name === "captions" && <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M10 9H7v6h3m7-6h-3v6h3" /></>}
    {name === "more" && <><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></>}
    {name === "lock" && <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></>}
    {name === "key" && <><circle cx="7" cy="12" r="4" /><path d="M11 12h10v3h-3v-3m-3 0v3" /></>}
    {name === "signout" && <><path d="M9 4H4v16h5m-1-8h13m-4-4 4 4-4 4" /></>}
    {name === "trash" && <><path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15m-8 4v7m4-7v7" /></>}
    {name === "check" && <path d="m5 12 4 4L19 6" />}
    {name === "layout" && <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11" /></>}
  </svg>;
}
