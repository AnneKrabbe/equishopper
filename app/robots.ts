import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/",
        "/checkout/",
        "/mine-ordrer/",
        "/mine-annoncer/",
        "/profil/",
        "/beskeder/",
        "/favorites/",
        "/login/",
        "/register/",
      ],
    },

    sitemap: "https://equishopper.dk/sitemap.xml",
  };
}