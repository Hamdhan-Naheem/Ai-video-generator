import { AppShell } from "@/components/app-shell";
import { ControlPreview } from "@/components/control-preview";

export const metadata = { title: "Shared controls — Development preview" };
export default function ControlsPage() { return <AppShell active="create"><ControlPreview /></AppShell>; }
