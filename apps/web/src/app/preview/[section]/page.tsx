import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Dashboard } from "@/components/dashboard";
import { CreateVideo } from "@/components/create-video";
import { VideoLibrary } from "@/components/video-library";
import { Settings } from "@/components/settings";
import { AppShell } from "@/components/app-shell";
import { isSection, navigation, sectionContent } from "@/lib/navigation";

export const dynamicParams = false;
export function generateStaticParams() { return navigation.map(({ key }) => ({ section: key })); }
type Props = { params: Promise<{ section: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section } = await params;
  return { title: isSection(section) ? sectionContent[section].title + " — Preview" : "Page unavailable" };
}
export default async function SectionPage({ params }: Props) {
  const { section } = await params;
  if (!isSection(section)) notFound();
  return <AppShell active={section}>
    {section === "dashboard" && <Dashboard />}
    {section === "create" && <Suspense fallback={<p role="status">Loading video choices…</p>}><CreateVideo /></Suspense>}
    {section === "videos" && <VideoLibrary />}
    {section === "settings" && <Settings />}
  </AppShell>;
}
