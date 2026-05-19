import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KOHĪ — Japan Coffee Marketplace",
    short_name: "KOHĪ",
    description: "Discover exceptional specialty coffee from independent Japanese roasters.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f5f2",
    theme_color: "#34150F",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
