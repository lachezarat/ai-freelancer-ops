import { AppShell } from "@/components/shell/app-shell";
import { requirePortalViewer } from "@/lib/data/app-data";

export default async function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const data = await requirePortalViewer();

  return <AppShell surface="portal" viewer={data.viewer}>{children}</AppShell>;
}
