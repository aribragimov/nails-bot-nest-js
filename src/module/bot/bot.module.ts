import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { TelegramBotService } from './bot.service';

import { WindowModule } from '../window';

@Module({
  imports: [ConfigModule, WindowModule],
  providers: [TelegramBotService, Logger],
  exports: [TelegramBotService],
})
export class TelegramBotModule {}
