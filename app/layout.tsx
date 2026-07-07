import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Sistema Tracking Recupero Moduli Docenti",
  description: "Sistema per il monitoraggio delle attività di recupero dei docenti",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}