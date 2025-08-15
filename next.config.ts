import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,

  // Transpile Three.js package
  transpilePackages: ["three"],

  // Allow images and videos from external domains
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "360cities.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "video.360cities.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.360cities.net",
        pathname: "/**",
      },
    ],
  },

  // Handle CORS for external resources
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },

  // Webpack configuration for handling video files and Three.js
  webpack: (config) => {
    // Handle video files
    config.module.rules.push({
      test: /\.(mp4|webm|ogg|swf|ogv)$/,
      use: {
        loader: "file-loader",
        options: {
          publicPath: "/_next/static/videos/",
          outputPath: "static/videos/",
          name: "[name].[hash].[ext]",
        },
      },
    });

    // Handle GLSL shaders if you need them for Three.js
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      exclude: /node_modules/,
      use: ["raw-loader", "glslify-loader"],
    });

    return config;
  },

  // TypeScript and ESLint configuration
  typescript: {
    // !! WARN !!
    // Set this to false if you want production builds to fail if there are TypeScript errors
    ignoreBuildErrors: false,
  },

  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
