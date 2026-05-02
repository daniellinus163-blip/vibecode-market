import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/profile", destination: "/settings", permanent: false },
      { source: "/home", destination: "/", permanent: false },
      { source: "/products", destination: "/shop", permanent: false },
      { source: "/product", destination: "/shop", permanent: false },
      { source: "/dashboard", destination: "/settings", permanent: false },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "picsum.photos", pathname: "/**" },
      { protocol: "https", hostname: "loremflickr.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
