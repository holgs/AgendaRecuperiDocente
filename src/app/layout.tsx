import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from '@/components/providers/theme-provider'
import { AuthProvider } from '@/components/auth/auth-provider'

export const metadata: Metadata = {
  title: "Sistema Tracking Recuperi",
  description: "Sistema web modulare per il monitoraggio e tracking delle attività di recupero moduli svolte dai docenti",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}