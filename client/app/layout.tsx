import "@/styles/globals.scss";
import { Metadata, Viewport } from "next";
import clsx from "clsx";
import Footer from "@/components/footer";
import { Providers } from "./providers";
import { AuthProvider } from "@/context/AuthContext";
import AuthRouter from "./authRouter";
import { siteConfig } from "@/config/site";
import { fontSans } from "@/config/fonts";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="en">
      <head />
      <body
        className={clsx(
          "min-h-screen bg-background font-sans antialiased overflow-x-hidden",
          fontSans.variable
        )}
      >
        <Providers>
          <AuthProvider>
          <AuthRouter>
            <div className="relative flex flex-col min-h-screen overflow-x-hidden">
              <Navbar />
              <main className="container mx-auto max-w-7xl pt-16 px-6 flex-grow overflow-x-hidden w-full">
                {children}
              </main>
              <Footer />
            </div>
          </AuthRouter>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}