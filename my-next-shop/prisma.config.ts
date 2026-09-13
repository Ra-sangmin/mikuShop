// 🌟 prisma.config.ts가 있으면 Prisma가 .env를 자동으로 읽지 않으므로 직접
// 로드해야 schema.prisma의 env("DATABASE_URL")이 정상적으로 resolve됩니다.
import 'dotenv/config';
import { defineConfig } from '@prisma/config';

export default defineConfig({});