import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://playpicturethis.com"),
  title: "Picture This — Turn Inside Jokes Into Ridiculous AI Pictures",
  description:
    "An AI party game for 2-8 players. Answer a prompt, watch AI turn it into a ridiculous picture, and vote for the funniest one. Free to play, phone friendly.",
  openGraph: {
    title: "Picture This — Turn Inside Jokes Into Ridiculous AI Pictures",
    description:
      "An AI party game for 2-8 players. Answer a prompt, watch AI turn it into a ridiculous picture, and vote for the funniest one.",
    url: "https://playpicturethis.com",
    siteName: "Picture This",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Picture This — Turn Inside Jokes Into Ridiculous AI Pictures",
    description:
      "An AI party game for 2-8 players. Answer a prompt, watch AI turn it into a ridiculous picture, and vote for the funniest one.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
