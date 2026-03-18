import type { NextConfig } from "next";

// 🚀 타입을 any로 지정하여 'eslint'나 'typescript' 속성 에러를 무시합니다.
const nextConfig: any = {
  /* 빌드 속도 향상을 위한 무시 옵션 */
  typescript: {
    ignoreBuildErrors: true,
  },

  /* Puppeteer 충돌 방지를 위한 외부 패키지 설정 */
  serverExternalPackages: [
    'puppeteer-extra',
    'puppeteer-extra-plugin-stealth',
    'puppeteer'
  ],
};

export default nextConfig;