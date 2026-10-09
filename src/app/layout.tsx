import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ayos Southville · Community reports",
  description: "A resident-led pilot for clearer community issue reporting in Southville 1.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
