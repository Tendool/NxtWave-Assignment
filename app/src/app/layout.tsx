import type { Metadata, Viewport } from "next";
import { Instrument_Serif, DM_Mono, Inter_Tight } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { MotionProvider } from "@/components/fx/motion-provider";
import "./globals.css";

const display = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});
const label = DM_Mono({
  variable: "--font-label",
  subsets: ["latin"],
  weight: ["400", "500"],
});
const body = Inter_Tight({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Build Your First AI Project in 60 Minutes — Free Workshop by NxtWave",
  description:
    "A free live workshop for final-year engineering students. Walk out with a deployed AI project you can put on your resume. Limited seats.",
};

export const viewport: Viewport = {
  themeColor: "#f3eee3",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${display.variable} ${label.variable} ${body.variable} h-full`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <MotionProvider>{children}</MotionProvider>
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
