import type { Metadata, Viewport } from "next";
import { Roboto, Geist_Mono } from "next/font/google";
import "../../styles/globals.css";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/sonner";

const roboto = Roboto({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SCCS - Smart Cycle Count Scoring",
  description:
    "Warehouse bin risk heatmap, audit plans, and the mobile count flow.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${roboto.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-muted/40">
        <Providers>
          <AppShell>{children}</AppShell>
          <Toaster richColors position="top-center" />
        </Providers>
      </body>
    </html>
  );
}
