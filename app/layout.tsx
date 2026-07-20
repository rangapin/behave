import type { Metadata } from "next";
import "./globals.css";

// §8 calls for a system sans and an SF Mono stack — no webfonts to load.
export const metadata: Metadata = {
  title: "surface",
  description: "behavioral interview drill",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
