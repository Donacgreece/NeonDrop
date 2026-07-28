import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/og.png`;
  return {
    title: "NEON DROP — One tap. No mercy.",
    description: "Drop through the gaps, build your streak and climb the global leaderboard.",
    icons: { icon: "/favicon.svg" },
    openGraph: { title: "NEON DROP", description: "ONE TAP. NO MERCY.", type: "website", images: [{ url:image, width:1536, height:910, alt:"Neon Drop arcade game" }] },
    twitter: { card:"summary_large_image", title:"NEON DROP", description:"ONE TAP. NO MERCY.", images:[image] },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0910",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={mono.variable}>{children}</body></html>;
}
