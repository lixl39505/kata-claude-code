import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Issue Management System",
  description: "Single organization issue management system",
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
