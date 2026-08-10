import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PHC Pedidos",
    short_name: "PHC Pedidos",
    description: "Pedidos e resultados do PHC Espetinho.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f6f2",
    theme_color: "#0b0b0c",
    orientation: "portrait",
    icons: [
      { src: "/phc-icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/phc-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
