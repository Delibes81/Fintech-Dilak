import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { Toaster } from "sonner";
import { ServiceWorker } from "@/components/pwa/ServiceWorker";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], weight: ["500", "700", "800"] });
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "La Libreta de Casa", template: "%s · La Libreta" },
  description: "Las finanzas de la familia en un solo lugar: gastos, ingresos, fijos, metas y consejos.",
  applicationName: "La Libreta",
  appleWebApp: { capable: true, title: "La Libreta", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f4f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0d17" },
  ],
};

// Aplica el tema elegido antes del primer pintado (evita el destello claro/oscuro).
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${bricolage.variable} ${figtree.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">
        {children}
        <Toaster
          position="top-center"
          offset={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
          mobileOffset={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
          toastOptions={{
            style: { borderRadius: 16, background: "var(--ink)", color: "var(--bg)", border: "none", fontWeight: 600 },
            actionButtonStyle: { background: "var(--accent)", color: "var(--accent-ink)", borderRadius: 10, fontWeight: 700 },
          }}
        />
        <ServiceWorker />
      </body>
    </html>
  );
}
