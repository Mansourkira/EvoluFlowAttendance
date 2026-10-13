/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Même déploiement que l'ERP : pm2 lance .next\standalone\server.js derrière IIS.
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // La géolocalisation est la seule permission utilisée ; caméra et micro restent fermés.
          { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=()" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
