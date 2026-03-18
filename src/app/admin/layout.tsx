import { AppShell } from "@/components/shell/app-shell";
import { requireAdminViewer } from "@/lib/data/app-data";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const data = await requireAdminViewer();

  return <AppShell surface="admin" viewer={data.viewer}>{children}</AppShell>;
}
