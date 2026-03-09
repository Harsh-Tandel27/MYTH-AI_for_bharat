import type { Metadata } from "next";
import { ClerkProvider } from '@clerk/nextjs';
import { WalletProvider } from '@/lib/wallet-context';
import { BillingProvider } from '@/lib/billing-context';
import "./globals.css";

// Replaced next/font/google with system font to fix Turbopack font resolution error
const fontSans = {
  className: "font-sans antialiased",
};

export const metadata: Metadata = {
  title: "MYTH",
  description: "Re-imagine any website in seconds with AI-powered website builder.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning className="dark">
        <body className={fontSans.className}>
          <BillingProvider>
            <WalletProvider>{children}</WalletProvider>
          </BillingProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
