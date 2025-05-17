require('dotenv').config();
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: 
    [
      new URL('http://localhost:3000/**'),
      new URL('https://s2.coinmarketcap.com/**'),
      new URL('https://images.unsplash.com/**'),
      new URL('https://i.giphy.com/**'),
      new URL('https://media0.giphy.com/**'),
      new URL('https://raw.githubusercontent.com/**'),

    ],
  },
};

export default nextConfig;
