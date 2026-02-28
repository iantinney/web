import type { Metadata } from "next";
import "./globals.css";
import { AppInitializer } from "@/components/AppInitializer";

export const metadata: Metadata = {
  title: "Web — Learn Infinitely, Your Way",
  description:
    "AI-powered adaptive learning — build your knowledge web from diagnosis to mastery.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        <AppInitializer />
        {children}
      </body>
    </html>
  );
}
