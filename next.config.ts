import type { NextConfig } from 'next';

const paddleCdn = 'https://cdn.paddle.com https://sandbox-cdn.paddle.com';
const paddleCheckout = 'https://buy.paddle.com https://sandbox-buy.paddle.com';
const paddleApi =
  'https://api.paddle.com https://sandbox-api.paddle.com https://create-checkout.paddle.com https://sandbox-create-checkout.paddle.com';
const supabase = 'https://*.supabase.co wss://*.supabase.co';

// React's dev build uses eval() for debugging features; never allowed in production.
const devEval = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '';

const csp = [
  "default-src 'self'",
  // 'wasm-unsafe-eval' lets the converters compile WebAssembly (ffmpeg, libheif,
  // pdf.js decoders) without allowing JavaScript eval.
  // 'unsafe-inline' is required by Next.js's inline RSC hydration payload and
  // JSON-LD tags, which carry per-request content and so can't be hash-pinned;
  // the alternative (nonce-based CSP) forces every page to dynamic rendering,
  // which would break static generation/CDN caching for the 50 SEO converter
  // pages this product's acquisition strategy depends on — tested with a real
  // browser and reverted. experimental.sri below adds build-time integrity
  // hashes to external script tags as a partial mitigation for tampered/CDN scripts.
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${devEval} ${paddleCdn}`,
  // pdf.js and ffmpeg.wasm run in same-origin workers; the HEIC decoder spawns a blob worker.
  "worker-src 'self' blob:",
  `style-src 'self' 'unsafe-inline' ${paddleCdn}`,
  `img-src 'self' data: blob: ${paddleCdn}`,
  "media-src 'self' blob:",
  "font-src 'self' data:",
  `connect-src 'self' blob: data: ${supabase} ${paddleApi} ${paddleCheckout}`,
  `frame-src ${paddleCheckout}`,
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'Content-Security-Policy', value: csp },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Build-time integrity hashes on script tags let script-src drop 'unsafe-inline'
  // in production while keeping every page statically generated (no nonce/dynamic
  // rendering trade-off, which would break the converter SEO pages' static caching).
  experimental: {
    sri: { algorithm: 'sha256' },
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        // Engine assets aren't content-hashed; refresh daily, serve stale meanwhile.
        source: '/vendor/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
    ];
  },
};

export default nextConfig;
