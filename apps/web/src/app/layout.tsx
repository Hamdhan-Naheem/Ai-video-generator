import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";
import "./workspace-pages.css";
import "./form-controls.css";

export const metadata: Metadata = {
  title: { default: "AI Video Studio — Development preview", template: "%s | AI Video Studio" },
  description: "Local application foundation for AI Video Studio. Product features are being built incrementally.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#F7F6F2", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
