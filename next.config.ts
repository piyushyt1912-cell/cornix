import type {NextConfig} from 'next';

const securityHeaders = [
  // Prevent MIME sniffing — stops browsers from guessing content types
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Prevent clickjacking — deny framing by any site
  { key: 'X-Frame-Options', value: 'DENY' },
  // Legacy XSS filter — still useful for older browsers
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  // Control referrer information leakage
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disable unnecessary browser APIs
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  // Enforce HTTPS (effective when deployed behind HTTPS)
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // Content Security Policy — restrict script/style/font sources
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://www.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com",
      "frame-src 'self' https://*.firebaseapp.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [],
  },
  transpilePackages: ['motion'],
  
  // Security headers — applied to all routes
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },

  webpack: (config, {dev}) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
