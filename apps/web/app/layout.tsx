import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import Footer from "@/components/Footer";
import Navbar from "@/components/ui/Navbar";
import { GetSession } from "@/lib/auth";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kroma",
  description: "Organisez, explorez et partagez vos photos par la couleur.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await GetSession();
  const navbarUser = session ? { firstName: session.firstName, lastName: session.lastName, email: session.email } : null;

  return (
    <html lang="fr" className={`bg-background  ${cn("font-sans", inter.variable)}`}>
      <body className={`min-h-screen flex flex-col antialiased`}>
        <Toaster position="top-center" />
        <Providers>
          <Navbar user={navbarUser} />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
