export const navigation = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard", href: "/preview/dashboard" },
  { key: "create", label: "Create video", icon: "plus-circle", href: "/preview/create" },
  { key: "videos", label: "My videos", icon: "videos", href: "/preview/videos" },
  { key: "settings", label: "Settings", icon: "settings", href: "/preview/settings" },
] as const;

export type Section = typeof navigation[number]["key"];
export function isSection(value: string): value is Section {
  return navigation.some((item) => item.key === value);
}

export const sectionContent: Record<Section, { title: string; description: string; heading: string; detail: string }> = {
  dashboard: {
    title: "Dashboard", description: "Your workspace for narrated videos.",
    heading: "Your studio starts here",
    detail: "This first step establishes the shared layout. Your projects and generation status will appear here as we connect the application.",
  },
  create: {
    title: "Create video", description: "One creation flow, three kinds of video.",
    heading: "The creation form is next",
    detail: "Education, software showcase and product branding will share settings and upload controls. Generation is not connected in this preview.",
  },
  videos: {
    title: "My videos", description: "A home for your videos and drafts.",
    heading: "Your library is on the way",
    detail: "Saved versions, drafts and expiry information will appear here once private storage and project data are connected. This preview does not read an account.",
  },
  settings: {
    title: "Settings", description: "Manage your profile and account security.",
    heading: "Account settings are on the way",
    detail: "Profile editing, password changes and account deletion will be added after authentication. No account is connected in this preview.",
  },
};
