import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Two Truths, One Who",
  description: "A local party game — guess whose truth it is.",
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
