import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "AI Freelancer Ops",
  description:
    "Backend-first freelancer SaaS built on Supabase, Stripe, realtime activity, and protected Gemini Edge Functions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${plexMono.variable} bg-canvas text-ink antialiased`}>
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(232,114,55,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(31,61,92,0.14),transparent_26%),linear-gradient(180deg,#f7f1e8_0%,#f2ece2_45%,#ebe4d8_100%)]">
          {children}
        </div>
      </body>
    </html>
  );
}
