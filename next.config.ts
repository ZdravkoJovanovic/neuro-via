

// next.config.ts
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },   // ESLint-Fehler bei "next build" ignorieren
  devIndicators: { buildActivity: false, appIsrStatus: false },
};
export default nextConfig;
