import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Fintech Dilak",
    short_name: "Dilak",
    description: "Finanzas familiares con inteligencia: gastos, ingresos, fijos, presupuestos, metas y consejos.",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f5fa",
    theme_color: "#f4f5fa",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Cargar un gasto", short_name: "Cargar", url: "/?nuevo=1", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Movimientos", url: "/movimientos" },
    ],
  };
}
