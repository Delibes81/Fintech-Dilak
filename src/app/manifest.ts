import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "La Libreta de Casa",
    short_name: "La Libreta",
    description: "Las finanzas de la familia: gastos, ingresos, fijos, metas y consejos.",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3f4f8",
    theme_color: "#3346e0",
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
