import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DataSourceOptions } from 'typeorm';

import { HealthController } from './health/health.controller';
import { TelegramBotModule } from './module/bot';
import { SvcConfigModule } from './config';

@Module({
  imports: [
    SvcConfigModule,
    HttpModule.register({
      timeout: 5000,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<{ database: DataSourceOptions }, true>) =>
        configService.get('database'),
    }),
    TelegramBotModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
