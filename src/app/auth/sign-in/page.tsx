import Link from "next/link";
import { signInAction } from "@/app/actions";

type AuthPageProps = {
  searchParams: Promise<{
    error?: string;
    notice?: string;
    detail?: string;
  }>;
};

function getSignInMessage(error?: string, notice?: string) {
  if (notice === "check_your_email") {
    return {
      tone: "notice",
      title: "Check your email",
      body: "Your account was created, but the session is waiting on email confirmation.",
    } as const;
  }

  switch (error) {
    case "invalid_credentials":
      return {
        tone: "error",
        title: "Enter a valid email and password",
        body: "The email format or password length did not pass validation before sign-in was attempted.",
      } as const;
    case "missing_supabase_env":
      return {
        tone: "error",
        title: "Supabase is not configured",
        body: "The app is missing the required Supabase environment values for auth.",
      } as const;
    case "sign_in_failed":
      return {
        tone: "error",
        title: "Sign-in failed",
        body: "Supabase rejected the sign-in request. Check the detail below for the exact reason.",
      } as const;
    default:
      return null;
  }
}

export default async function SignInPage({ searchParams }: AuthPageProps) {
  const { error, notice, detail } = await searchParams;
  const message = getSignInMessage(error, notice);

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl items-center px-6 py-10">
      <div className="grid w-full gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="border border-line bg-paper p-8">
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-muted">Session entry</p>
          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.06em] text-ink">Sign in once. Move across workspace, portal, and tools.</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted">
            Shared Supabase Auth powers the freelancer workspace, client portal, realtime subscriptions,
            and protected Edge Function access under one session model.
          </p>
        </section>
        <section className="panel-shadow border border-line bg-paper p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Sign in</h2>
          {message ? (
            <div
              className={`mt-6 border px-4 py-4 ${
                message.tone === "error"
                  ? "border-[#b94a48] bg-[#fff1ef] text-[#7a1f1b]"
                  : "border-[#a88b37] bg-[#fff8dd] text-[#6e5714]"
              }`}
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.22em]">Auth status</p>
              <p className="mt-2 text-sm font-semibold">{message.title}</p>
              <p className="mt-2 text-sm leading-6">{message.body}</p>
              {detail ? (
                <p className="mt-3 border-t border-current/20 pt-3 text-sm leading-6">
                  Supabase detail: {detail}
                </p>
              ) : null}
            </div>
          ) : null}
          <form action={signInAction} className="mt-6 space-y-4">
            <input
              name="email"
              type="email"
              placeholder="Email"
              className="w-full border border-line bg-canvas px-4 py-3 text-sm outline-none focus:border-ink"
              required
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              className="w-full border border-line bg-canvas px-4 py-3 text-sm outline-none focus:border-ink"
              required
            />
            <button className="button-primary w-full border px-4 py-3 text-sm font-medium uppercase tracking-[0.18em]">
              Sign in
            </button>
          </form>
          <p className="mt-5 text-sm text-muted">
            Need a freelancer account?{" "}
            <Link href="/auth/sign-up" className="font-medium text-ink underline underline-offset-4">
              Create one
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
