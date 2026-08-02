import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FingerQuest",
    short_name: "FingerQuest",
    description:
      "Game finger-tracking realtime di browser — tebak bendera, puzzle, puzzle foto, batu gunting kertas, dan Simon Says, dikendalikan dengan gestur tangan.",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0a0a14",
    theme_color: "#0a0a14",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
