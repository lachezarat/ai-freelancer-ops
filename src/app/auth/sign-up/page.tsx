import Link from "next/link";
import { signUpAction } from "@/app/actions";

type AuthPageProps = {
  searchParams: Promise<{
    error?: string;
    detail?: string;
  }>;
};

function getSignUpMessage(error?: string) {
  switch (error) {
    case "invalid_signup_fields":
      return {
        title: "Check the signup fields",
        body: "Name, workspace name, email, or password did not pass validation before the signup request was sent.",
      } as const;
    case "missing_supabase_env":
      return {
        title: "Supabase is not configured",
        body: "The app is missing the required Supabase environment values for auth.",
      } as const;
    case "sign_up_failed":
      return {
        title: "Account creation failed",
        body: "Supabase rejected the signup request. Check the detail below for the exact reason.",
      } as const;
    default:
      return null;
  }
}

export default async function SignUpPage({ searchParams }: AuthPageProps) {
  const { error, detail } = await searchParams;
  const message = getSignUpMessage(error);

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl items-center px-6 py-10">
      <div className="grid w-full gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="border border-line bg-paper p-8">
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-muted">Freelancer onboarding</p>
          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.06em] text-ink">
            Create the workspace contract first.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted">
            New freelancer signups create a profile plus a single owned workspace. Billing, RLS, AI
            tool access, and portal assignments all anchor on that workspace boundary.
          </p>
        </section>
        <section className="panel-shadow border border-line bg-paper p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Create freelancer account</h2>
          {message ? (
            <div className="mt-6 border border-[#b94a48] bg-[#fff1ef] px-4 py-4 text-[#7a1f1b]">
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
          <form action={signUpAction} className="mt-6 space-y-4">
            <input
              name="fullName"
              type="text"
              placeholder="Full name"
              className="w-full border border-line bg-canvas px-4 py-3 text-sm outline-none focus:border-ink"
              required
            />
            <input
              name="workspaceName"
              type="text"
              placeholder="Workspace name"
              className="w-full border border-line bg-canvas px-4 py-3 text-sm outline-none focus:border-ink"
              required
            />
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
              Create workspace
            </button>
          </form>
          <p className="mt-5 text-sm text-muted">
            Already have a session?{" "}
            <Link href="/auth/sign-in" className="font-medium text-ink underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
