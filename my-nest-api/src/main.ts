import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
  origin: [
      'http://localhost:3000',
      'https://proteolytic-karon-nontemperately.ngrok-free.dev' // Next.js 주소
    ],
  methods: 'GET,POST,PUT,DELETE',
  credentials: true, // 쿠키나 인증 헤더를 허용할 경우
  });

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
