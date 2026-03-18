import { AppShell } from "@/components/shell/app-shell";
import { requireWorkspaceViewer } from "@/lib/data/app-data";

export default async function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const data = await requireWorkspaceViewer();

  return <AppShell surface="workspace" viewer={data.viewer}>{children}</AppShell>;
}
