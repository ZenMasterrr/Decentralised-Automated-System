
import 'core-js/features/array/find';
import 'core-js/features/array/includes';
import 'core-js/features/number/is-nan';

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Web3Provider } from "@/components/Web3Provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DTeams App",
  description: "Decentralized Teams Application",};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-gray-50`}>
        <Providers>
          <Web3Provider>
            <main className="container mx-auto p-4">
              {children}
            </main>
          </Web3Provider>
        </Providers>
      </body>
    </html>
  );
}
