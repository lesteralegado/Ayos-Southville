import type { Metadata } from "next";
import "./globals.css";
import { getVerifiedOperator } from "@/features/auth/session";
import { ProductNavigation } from "@/features/navigation/product-navigation";

export const metadata: Metadata = {
  title: "Ayos Southville · Community reports",
  description: "A resident-led pilot for clearer community issue reporting in Southville 1.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const actor = await getVerifiedOperator();
  return (
    <html lang="en">
      <body>{process.env.NEXT_PUBLIC_DEMO_MODE === "true" && <div className="global-demo-banner" role="status">Demonstration mode · Synthetic data · Not an official service</div>}<ProductNavigation roles={actor?.roles} signedIn={!!actor} />{children}</body>
    </html>
  );
}
