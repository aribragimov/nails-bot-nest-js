import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WindowEntity } from './window.entity';
import { WindowService } from './window.service';

@Module({
  imports: [TypeOrmModule.forFeature([WindowEntity])],
  providers: [WindowService, Logger],
  exports: [WindowService],
})
export class WindowModule {}
