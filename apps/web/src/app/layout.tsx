import "./public.css";
import "./video-library.css";
import "./education-result.css";
import {headers} from "next/headers";
import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";
import "./workspace-pages.css";
import "./form-controls.css";
import "./education-form.css";
import "./software-form.css";
import "./auth.css";
import "./dashboard-live.css";
import "./drafts.css";
import "./uploads.css";
import "./generation-progress.css";
import "./account-actions.css";

export const metadata: Metadata = {
  title: { default: "AI Video Studio — Narrated Education videos", template: "%s | AI Video Studio" },
  description: "Turn educational notes into illustrated videos with AI narration and captions. Explore the Education learning preview.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#F7F6F2", colorScheme: "light" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await headers(); // Per-request nonce: never statically cache one document policy.
  return <html lang="en"><body>{children}</body></html>;
}
