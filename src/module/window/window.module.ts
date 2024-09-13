import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WindowEntity } from './window.entity';
import { WindowService } from './window.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([WindowEntity])],
  providers: [WindowService, Logger],
  exports: [WindowService],
})
export class WindowModule {}
