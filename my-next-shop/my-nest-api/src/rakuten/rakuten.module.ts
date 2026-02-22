// rakuten.module.ts
import { Module } from '@nestjs/common';
import { RakutenController } from './rakuten.controller';
import { RakutenService } from './rakuten.service';

@Module({
  controllers: [RakutenController], // 👈 여기에 추가되었는지 확인
  providers: [RakutenService],
})
export class RakutenModule {}