import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import { ServiceWorker } from "@/components/pwa/ServiceWorker";
import { MotionProvider } from "@/components/motion/MotionProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Fintech Dilak", template: "%s · Dilak" },
  description: "Las finanzas de tu familia con inteligencia: gastos, ingresos, fijos, presupuestos, metas y consejos automáticos.",
  applicationName: "Fintech Dilak",
  appleWebApp: { capable: true, title: "Dilak", statusBarStyle: "black-translucent" },
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
  themeColor: "#07080d",
};

// Tema antes del primer pintado: oscuro por defecto; "light" o "system" si la persona lo eligió.
const themeScript = `try{var t=localStorage.getItem('theme');var d=document.documentElement;if(t==='light')d.dataset.theme='light';else if(t==='system')delete d.dataset.theme;else d.dataset.theme='dark'}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" data-theme="dark" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">
        <MotionProvider>{children}</MotionProvider>
        <Toaster
          position="top-center"
          offset={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
          mobileOffset={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
          toastOptions={{
            style: {
              borderRadius: 16, background: "color-mix(in srgb, var(--surface-2) 92%, transparent)", color: "var(--ink)",
              border: "1px solid var(--line)", backdropFilter: "blur(12px)", fontWeight: 500,
              boxShadow: "0 20px 50px -20px rgb(0 0 0 / .6)",
            },
            actionButtonStyle: { background: "var(--accent)", color: "var(--accent-ink)", borderRadius: 9, fontWeight: 600 },
          }}
        />
        <ServiceWorker />
      </body>
    </html>
  );
}
