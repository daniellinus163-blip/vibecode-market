import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/site/Providers";
import { SiteHeader } from "@/components/site/SiteHeader";
import { PageTransition } from "@/components/site/PageTransition";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { NotificationHub } from "@/components/site/NotificationHub";
import { FashionStylistChat } from "@/components/site/FashionStylistChat";

export const metadata: Metadata = {
  title: "VIBECODE — Premium Clothing",
  description: "Premium, modern clothing experience.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <SiteHeader />
          <NotificationHub />
          <PageTransition>{children}</PageTransition>
          <MobileBottomNav />
          <FashionStylistChat />
        </Providers>
      </body>
    </html>
  );
}

