import { defineConfig } from '@prisma/config';

export default defineConfig({
  datasource: {
    // 반드시 process.env.DATABASE_URL 로 되어 있어야 합니다.
    url: process.env.DATABASE_URL,
  },
});