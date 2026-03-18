import Link from "next/link";
import { signOutAction } from "@/app/actions";
import type { Viewer } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn, titleCase } from "@/lib/utils";

type Surface = "workspace" | "portal" | "admin";

const surfaceLinks: Record<Surface, Array<{ href: string; label: string }>> = {
  workspace: [
    { href: "/workspace", label: "Overview" },
    { href: "/workspace/clients", label: "Clients" },
    { href: "/workspace/billing", label: "Billing" },
    { href: "/tools", label: "AI Tools" },
  ],
  portal: [
    { href: "/portal", label: "Portal Home" },
    { href: "/portal#projects", label: "Projects" },
  ],
  admin: [
    { href: "/admin", label: "Admin" },
    { href: "/workspace", label: "Workspace" },
  ],
};

export function AppShell({
  surface,
  viewer,
  children,
}: {
  surface: Surface;
  viewer: Viewer;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-5">
          <div>
            <Link href="/" className="font-mono text-xs uppercase tracking-[0.36em] text-muted">
              AI Freelancer Ops
            </Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
              {surface === "workspace"
                ? viewer.workspaceName ?? "Freelancer Workspace"
                : surface === "portal"
                  ? "Client Portal"
                  : "Admin Console"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone={viewer.mode === "demo" ? "neutral" : "signal"}>
              {viewer.mode === "demo" ? "Demo mode" : "Live mode"}
            </Badge>
            <Badge tone={viewer.planCode === "studio" ? "success" : "neutral"}>
              {titleCase(viewer.planCode)}
            </Badge>
            {viewer.isAuthenticated ? (
              <form action={signOutAction}>
                <button className="button-quiet border px-4 py-2 text-sm font-medium">
                  Sign out
                </button>
              </form>
            ) : (
              <Link
                href="/auth/sign-in"
                className="button-quiet border px-4 py-2 text-sm font-medium"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="border border-line bg-paper p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-muted">
            {viewer.fullName}
          </p>
          <p className="mt-2 text-sm text-muted">
            {viewer.role === "guest" ? "Guest preview" : `${titleCase(viewer.role)} surface`}
          </p>
          <nav className="mt-8 flex flex-col gap-2">
            {surfaceLinks[surface].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "border px-3 py-3 text-sm font-medium",
                  item.href === "/tools" && surface === "workspace"
                    ? "button-quiet-active"
                    : "button-quiet",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="space-y-8">{children}</main>
      </div>
    </div>
  );
}
