import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { TelegramBotService } from './module/tg-bot';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);

  const telegramService = app.get(TelegramBotService);
  const logger = app.get(Logger);
  telegramService.initBot();
  logger.log('Nails Bot Started 🚀');
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
